-- LOCAL PROTOTYPE ONLY. Requires atomic-library-update.sql.
-- Client generates one item UUID before upload and retains it until outcome is known.
-- This proposal does not validate newly uploaded Storage URLs; do not install as-is.
BEGIN;
CREATE TABLE public.library_create_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  section text NOT NULL CHECK (section IN ('education','activity','certificate')),
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,item_id)
);
-- No source FK: deleting a source must not make replay recreate it.
ALTER TABLE public.library_create_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.library_create_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.library_create_receipts TO authenticated;
CREATE POLICY own_library_create_receipts ON public.library_create_receipts
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

CREATE FUNCTION public.create_library_item_atomic(
  p_section text, p_item_id uuid, p_fields jsonb, p_images jsonb, p_tag_ids uuid[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); source_table text; allowed_fields text[];
  receipt public.library_create_receipts%ROWTYPE;
  fingerprint text; columns_sql text; values_sql text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_item_id IS NULL OR jsonb_typeof(p_fields) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_images) IS DISTINCT FROM 'array' OR p_tag_ids IS NULL THEN
    RAISE EXCEPTION 'Invalid create payload' USING ERRCODE='22023';
  END IF;
  CASE p_section
    WHEN 'education' THEN
      source_table := 'user_library_educations';
      allowed_fields := ARRAY['level','school_name','study_plan','gpa','start_year','end_year','logo_url'];
      IF coalesce(btrim(p_fields->>'level'),'')='' OR coalesce(btrim(p_fields->>'school_name'),'')='' THEN
        RAISE EXCEPTION 'Required education fields missing' USING ERRCODE='22023';
      END IF;
    WHEN 'activity' THEN
      source_table := 'user_library_activities';
      allowed_fields := ARRAY['title','description','activity_date','organization'];
    WHEN 'certificate' THEN
      source_table := 'user_library_certificates';
      allowed_fields := ARRAY['title','description','issued_by','issued_date'];
    ELSE RAISE EXCEPTION 'Invalid section' USING ERRCODE='22023';
  END CASE;
  IF p_section<>'education' AND coalesce(btrim(p_fields->>'title'),'')='' THEN
    RAISE EXCEPTION 'Title required' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_fields) key WHERE NOT key=ANY(allowed_fields)) THEN
    RAISE EXCEPTION 'Unsupported field' USING ERRCODE='22023';
  END IF;
  fingerprint := encode(sha256(convert_to(jsonb_build_object(
    'section',p_section,'fields',p_fields,'images',p_images,'tags',p_tag_ids
  )::text,'UTF8')),'hex');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('library-create:'||uid::text||':'||p_item_id::text,0));
  SELECT * INTO receipt FROM public.library_create_receipts WHERE user_id=uid AND item_id=p_item_id;
  IF FOUND THEN
    IF receipt.section<>p_section OR receipt.request_fingerprint<>fingerprint THEN
      RAISE EXCEPTION 'Create key reused with different arguments' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('id',p_item_id,'status','confirmed');
  END IF;
  -- A preexisting source without this receipt is never treated as a successful create.
  -- Plain INSERT, not upsert: stale creates cannot overwrite an existing item.
  SELECT string_agg(format('%I',key),',' ORDER BY key), string_agg(format('r.%I',key),',' ORDER BY key)
    INTO columns_sql,values_sql FROM jsonb_object_keys(p_fields) key;
  EXECUTE format('INSERT INTO public.%I (id,user_id,%s) SELECT $1,$2,%s FROM jsonb_populate_record(NULL::public.%I,$3) r',source_table,columns_sql,values_sql,source_table)
    USING p_item_id,uid,p_fields;
  -- Reuse update validation, image limits, image ownership, tag ownership and write ordering.
  -- A failure here rolls back the source INSERT and leaves no receipt.
  PERFORM public.update_library_item_atomic(p_section,p_item_id,p_fields,p_images,p_tag_ids);
  INSERT INTO public.library_create_receipts(user_id,item_id,section,request_fingerprint)
    VALUES(uid,p_item_id,p_section,fingerprint);
  RETURN jsonb_build_object('id',p_item_id,'status','confirmed');
END $$;
REVOKE ALL ON FUNCTION public.create_library_item_atomic(text,uuid,jsonb,jsonb,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_library_item_atomic(text,uuid,jsonb,jsonb,uuid[]) TO authenticated;
COMMIT;
