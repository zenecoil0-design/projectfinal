-- LOCAL PROTOTYPE ONLY. Apply after portfolio-item-snapshots.sql in an isolated test DB.
-- Not a hosted migration. Existing UI writes must be replaced before these revocations.
BEGIN;

CREATE FUNCTION public.update_library_item_atomic(
  p_section text, p_item_id uuid, p_fields jsonb, p_images jsonb, p_tag_ids uuid[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  source_table text; image_table text; tag_table text; parent_column text;
  allowed_fields text[]; field_name text; assignments text;
  original jsonb; updated jsonb; image jsonb; image_id uuid; stored_url text;
  retained_ids uuid[] := '{}'; image_limit integer; new_count integer := 0;
  position integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  CASE p_section
    WHEN 'education' THEN
      source_table := 'user_library_educations'; parent_column := 'education_id';
      allowed_fields := ARRAY['level','school_name','study_plan','gpa','start_year','end_year','logo_url'];
    WHEN 'activity' THEN
      source_table := 'user_library_activities'; parent_column := 'activity_id';
      image_table := 'user_library_activity_images'; image_limit := 4;
      allowed_fields := ARRAY['title','description','activity_date','organization'];
    WHEN 'certificate' THEN
      source_table := 'user_library_certificates'; parent_column := 'certificate_id';
      image_table := 'user_library_certificate_images'; image_limit := 2;
      allowed_fields := ARRAY['title','description','issued_by','issued_date'];
    ELSE RAISE EXCEPTION 'Invalid section' USING ERRCODE = '22023';
  END CASE;
  tag_table := 'user_library_' || p_section || '_tags';
  IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_images) IS DISTINCT FROM 'array'
    OR p_tag_ids IS NULL OR array_position(p_tag_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid save payload' USING ERRCODE = '22023';
  END IF;
  IF cardinality(p_tag_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_tag_ids) id) THEN
    RAISE EXCEPTION 'Duplicate tags' USING ERRCODE = '22023';
  END IF;
  FOR field_name IN SELECT jsonb_object_keys(p_fields) LOOP
    IF NOT field_name = ANY(allowed_fields) THEN
      RAISE EXCEPTION 'Unsupported field' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_fields->field_name) NOT IN ('string','null')
      AND NOT (field_name = 'gpa' AND jsonb_typeof(p_fields->field_name) = 'number') THEN
      RAISE EXCEPTION 'Invalid field type' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- All content writers must take this parent lock before mutating image rows.
  -- Snapshot capture takes FOR SHARE on the same row.
  EXECUTE format('SELECT to_jsonb(l) FROM public.%I l WHERE id=$1 AND user_id=$2 FOR UPDATE', source_table)
    INTO original USING p_item_id, uid;
  IF original IS NULL THEN
    RAISE EXCEPTION 'Source unavailable' USING ERRCODE = '42501';
  END IF;
  updated := original || p_fields;
  IF p_section = 'education' THEN
    IF coalesce(btrim(updated->>'school_name'),'') = '' OR coalesce(btrim(updated->>'level'),'') = '' THEN
      RAISE EXCEPTION 'Required education fields missing' USING ERRCODE = '22023';
    END IF;
    IF updated->>'gpa' IS NOT NULL AND ((updated->>'gpa')::numeric NOT BETWEEN 0 AND 4) THEN
      RAISE EXCEPTION 'Invalid GPA' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_images) <> 0 THEN
      RAISE EXCEPTION 'Education uses a logo field' USING ERRCODE = '22023';
    END IF;
  ELSIF coalesce(btrim(updated->>'title'),'') = '' THEN
    RAISE EXCEPTION 'Title required' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.user_tags WHERE user_id=uid AND id=ANY(p_tag_ids)) <> cardinality(p_tag_ids) THEN
    RAISE EXCEPTION 'Tag access denied' USING ERRCODE = '42501';
  END IF;

  IF image_table IS NOT NULL THEN
    FOR image IN SELECT value FROM jsonb_array_elements(p_images) LOOP
      IF jsonb_typeof(image) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Invalid image' USING ERRCODE = '22023';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(image) key WHERE key NOT IN ('id','image_url'))
        OR jsonb_typeof(image->'image_url') IS DISTINCT FROM 'string'
        OR btrim(image->>'image_url') = '' THEN
        RAISE EXCEPTION 'Invalid image fields' USING ERRCODE = '22023';
      END IF;
      image_id := (image->>'id')::uuid;
      IF image_id IS NULL THEN
        new_count := new_count + 1;
      ELSE
        IF image_id=ANY(retained_ids) THEN
          RAISE EXCEPTION 'Duplicate image' USING ERRCODE = '22023';
        END IF;
        EXECUTE format('SELECT image_url FROM public.%I WHERE id=$1 AND %I=$2',image_table,parent_column)
          INTO stored_url USING image_id,p_item_id;
        IF stored_url IS NULL OR stored_url IS DISTINCT FROM image->>'image_url' THEN
          RAISE EXCEPTION 'Image access denied or changed' USING ERRCODE = '42501';
        END IF;
        retained_ids := array_append(retained_ids,image_id);
      END IF;
    END LOOP;
    -- Preserve legacy over-limit rows; only additions must fit the current ceiling.
    IF new_count > 0 AND jsonb_array_length(p_images) > image_limit THEN
      RAISE EXCEPTION 'Image limit exceeded' USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT string_agg(format('%I=r.%I', key, key), ', ' ORDER BY key)
    INTO assignments FROM jsonb_object_keys(p_fields) key;
  IF assignments IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I l SET %s FROM jsonb_populate_record(NULL::public.%I,$3) r WHERE l.id=$1 AND l.user_id=$2 RETURNING to_jsonb(l)',source_table,assignments,source_table)
      INTO updated USING p_item_id,uid,updated;
  END IF;
  IF image_table IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.%I WHERE %I=$1 AND NOT (id=ANY($2))',image_table,parent_column)
      USING p_item_id,retained_ids;
    FOR image IN SELECT value FROM jsonb_array_elements(p_images) LOOP
      image_id := (image->>'id')::uuid;
      IF image_id IS NULL THEN
        EXECUTE format('INSERT INTO public.%I (%I,image_url,sort_order) VALUES($1,$2,$3)',image_table,parent_column)
          USING p_item_id,image->>'image_url',position;
      ELSE
        EXECUTE format('UPDATE public.%I SET sort_order=$3 WHERE id=$1 AND %I=$2',image_table,parent_column)
          USING image_id,p_item_id,position;
      END IF;
      position := position + 1;
    END LOOP;
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE %I=$1',tag_table,parent_column) USING p_item_id;
  EXECUTE format('INSERT INTO public.%I (%I,tag_id) SELECT $1,id FROM unnest($2::uuid[]) id',tag_table,parent_column)
    USING p_item_id,p_tag_ids;
  -- A single statement/RPC transaction commits text, logo, image rows and tag links together.
  -- It does NOT make Storage upload or network acknowledgement transactional.
  RETURN jsonb_build_object('id',p_item_id,'item',updated);
END $$;
REVOKE ALL ON FUNCTION public.update_library_item_atomic(text,uuid,jsonb,jsonb,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_library_item_atomic(text,uuid,jsonb,jsonb,uuid[]) TO authenticated;

-- Prototype enforcement: old multi-request content/image writers must fail, not bypass the lock.
REVOKE INSERT, UPDATE ON public.user_library_educations,public.user_library_activities,public.user_library_certificates FROM PUBLIC,anon,authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_library_activity_images,public.user_library_certificate_images FROM PUBLIC,anon,authenticated;
COMMIT;
