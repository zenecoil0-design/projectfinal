-- LOCAL PROTOTYPE ONLY. Apply after portfolio-item-snapshots.sql in an isolated fixture.
-- Do not install before atomic library callers, grants and concurrency acceptance are ready.
BEGIN;

-- Explicit, replay-safe preparation. Captures today's content, never invented history.
-- All three sections transition in one transaction; existing editions are left intact.
CREATE FUNCTION public.prepare_portfolio_item_snapshots(p_portfolio_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); section_name text; relation_name text; item_column text;
  selected record; prepared integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.portfolios WHERE id=p_portfolio_id AND user_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portfolio access denied' USING ERRCODE='42501'; END IF;

  FOREACH section_name IN ARRAY ARRAY['education','activity','certificate'] LOOP
    relation_name := CASE section_name WHEN 'education' THEN 'portfolio_educations'
      WHEN 'activity' THEN 'portfolio_activities' ELSE 'portfolio_certificates' END;
    item_column := section_name || '_id';
    FOR selected IN EXECUTE format(
      'SELECT %I AS item_id,snapshot_data,snapshot_revision,snapshot_version
       FROM public.%I WHERE portfolio_id=$1 ORDER BY sort_order,%I FOR UPDATE',
      item_column,relation_name,item_column) USING p_portfolio_id
    LOOP
      IF selected.snapshot_data IS NULL AND selected.snapshot_revision IS NULL
         AND selected.snapshot_version=0 THEN
        PERFORM public.capture_portfolio_item_snapshot(p_portfolio_id,section_name,selected.item_id);
        prepared := prepared+1;
      ELSIF selected.snapshot_data IS NULL
         OR jsonb_typeof(selected.snapshot_data->'item') IS DISTINCT FROM 'object'
         OR jsonb_typeof(selected.snapshot_data->'images') IS DISTINCT FROM 'array'
         OR selected.snapshot_data->'item'->>'id' IS DISTINCT FROM selected.item_id::text
         OR selected.snapshot_data->'item'->>'user_id' IS DISTINCT FROM uid::text
         OR selected.snapshot_version < 1
         OR selected.snapshot_revision IS DISTINCT FROM md5(selected.snapshot_data::text) THEN
        -- An incomplete/corrupt edition is not an old portfolio. Never silently recapture it.
        RAISE EXCEPTION 'Invalid stored snapshot' USING ERRCODE='22023';
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('portfolio_id',p_portfolio_id,'prepared_count',prepared);
END $$;
REVOKE ALL ON FUNCTION public.prepare_portfolio_item_snapshots(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_portfolio_item_snapshots(uuid) TO authenticated;

-- An ordinary read must never accept a newer edition or prepare an old portfolio.
-- Invoker security preserves table RLS; owner checks also reject foreign/missing portfolios.
CREATE FUNCTION public.read_portfolio_item_snapshots(p_portfolio_id uuid,p_section text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); library_name text; relation_name text; item_column text;
  image_table text; source_expression text; result jsonb; entry jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.portfolios WHERE id=p_portfolio_id AND user_id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portfolio access denied' USING ERRCODE='42501'; END IF;
  CASE p_section
    WHEN 'education' THEN library_name:='user_library_educations'; relation_name:='portfolio_educations';
    WHEN 'activity' THEN library_name:='user_library_activities'; relation_name:='portfolio_activities'; image_table:='user_library_activity_images';
    WHEN 'certificate' THEN library_name:='user_library_certificates'; relation_name:='portfolio_certificates'; image_table:='user_library_certificate_images';
    ELSE RAISE EXCEPTION 'Invalid section' USING ERRCODE='22023';
  END CASE;
  item_column := p_section || '_id';
  -- Same canonical content as capture: updated_at is excluded and image order is deterministic.
  source_expression := 'jsonb_build_object(''item'',to_jsonb(l)-''updated_at'',''images'',''[]''::jsonb)';
  IF image_table IS NOT NULL THEN
    source_expression := format('jsonb_build_object(''item'',to_jsonb(l)-''updated_at'',''images'',
      coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order,i.id)
        FROM public.%I i WHERE i.%I=l.id),''[]''::jsonb))',image_table,item_column);
  END IF;
  EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(
      ''item_id'',r.%I,''sort_order'',r.sort_order,''data'',r.snapshot_data,
      ''revision'',r.snapshot_revision,''version'',r.snapshot_version,
      ''latest_revision'',CASE WHEN l.id IS NOT NULL THEN md5((%s)::text) END
    ) ORDER BY r.sort_order,r.%I),''[]''::jsonb)
    FROM public.%I r LEFT JOIN public.%I l ON l.id=r.%I AND l.user_id=$2
    WHERE r.portfolio_id=$1',item_column,source_expression,item_column,relation_name,library_name,item_column)
    INTO result USING p_portfolio_id,uid;

  FOR entry IN SELECT value FROM jsonb_array_elements(result) LOOP
    IF entry->'data' = 'null'::jsonb AND entry->'revision' = 'null'::jsonb
       AND (entry->>'version')::bigint=0 THEN
      RAISE EXCEPTION 'Snapshot preparation required' USING ERRCODE='55000';
    END IF;
    IF jsonb_typeof(entry->'data'->'item') IS DISTINCT FROM 'object'
       OR jsonb_typeof(entry->'data'->'images') IS DISTINCT FROM 'array'
       OR entry->'data'->'item'->>'id' IS DISTINCT FROM entry->>'item_id'
       OR entry->'data'->'item'->>'user_id' IS DISTINCT FROM uid::text
       OR (entry->>'version')::bigint < 1
       OR entry->>'revision' IS DISTINCT FROM md5((entry->'data')::text)
       OR entry->>'latest_revision' IS NULL THEN
      RAISE EXCEPTION 'Invalid stored snapshot or inaccessible source' USING ERRCODE='22023';
    END IF;
  END LOOP;
  RETURN jsonb_build_object('format_version',1,'portfolio_id',p_portfolio_id,'section',p_section,'items',result);
END $$;
REVOKE ALL ON FUNCTION public.read_portfolio_item_snapshots(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_portfolio_item_snapshots(uuid,text) TO authenticated;
COMMIT;
