-- LOCAL PROTOTYPE ONLY: not an installable migration yet.
-- UI readers, atomic library writes, copy RPC and old-portfolio backfill must be integrated first.
BEGIN;
ALTER TABLE public.portfolio_educations
 ADD COLUMN snapshot_data jsonb,
 ADD COLUMN snapshot_revision text,
 ADD COLUMN snapshot_version bigint NOT NULL DEFAULT 0;
REVOKE INSERT, UPDATE, DELETE ON public.portfolio_educations FROM authenticated, anon;
ALTER TABLE public.portfolio_activities
 ADD COLUMN snapshot_data jsonb,
 ADD COLUMN snapshot_revision text,
 ADD COLUMN snapshot_version bigint NOT NULL DEFAULT 0;
REVOKE INSERT, UPDATE, DELETE ON public.portfolio_activities FROM authenticated, anon;
ALTER TABLE public.portfolio_certificates
 ADD COLUMN snapshot_data jsonb,
 ADD COLUMN snapshot_revision text,
 ADD COLUMN snapshot_version bigint NOT NULL DEFAULT 0;
REVOKE INSERT, UPDATE, DELETE ON public.portfolio_certificates FROM authenticated, anon;
CREATE FUNCTION public.capture_portfolio_item_snapshot(
 p_portfolio_id uuid, p_section text, p_item_id uuid,
 p_refresh boolean DEFAULT false, p_expected_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 uid uuid := auth.uid(); lib text; rel text; col text; imgs text;
 payload jsonb; rev text; old_data jsonb; old_rev text; version bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.portfolios WHERE id=p_portfolio_id AND user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Portfolio access denied' USING ERRCODE='42501'; END IF;
 CASE p_section
 WHEN 'education' THEN lib:='user_library_educations'; rel:='portfolio_educations'; col:='education_id'; imgs:=NULL;
 WHEN 'activity' THEN lib:='user_library_activities'; rel:='portfolio_activities'; col:='activity_id'; imgs:='user_library_activity_images';
 WHEN 'certificate' THEN lib:='user_library_certificates'; rel:='portfolio_certificates'; col:='certificate_id'; imgs:='user_library_certificate_images';
 ELSE RAISE EXCEPTION 'Invalid section' USING ERRCODE='22023'; END CASE;
 IF p_refresh IS NULL THEN RAISE EXCEPTION 'Invalid refresh mode' USING ERRCODE='22023'; END IF;
 EXECUTE format('SELECT snapshot_data,snapshot_revision,snapshot_version FROM public.%I WHERE portfolio_id=$1 AND %I=$2 FOR UPDATE',rel,col)
 INTO old_data,old_rev,version USING p_portfolio_id,p_item_id;
 IF version IS NULL THEN RAISE EXCEPTION 'Item is not selected' USING ERRCODE='22023'; END IF;
 -- Parent lock serializes capture against source deletion. Data and image rows are
 -- read in one statement, so a capture never combines two SQL statement snapshots.
 EXECUTE format('SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2 FOR SHARE',lib) USING p_item_id,uid;
 IF imgs IS NULL THEN
  EXECUTE format('SELECT jsonb_build_object(''item'',to_jsonb(l)-''updated_at'',''images'',''[]''::jsonb) FROM public.%I l WHERE id=$1 AND user_id=$2',lib) INTO payload USING p_item_id,uid;
 ELSE
  EXECUTE format('SELECT jsonb_build_object(''item'',to_jsonb(l)-''updated_at'',''images'',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order,i.id) FROM public.%I i WHERE i.%I=l.id),''[]''::jsonb)) FROM public.%I l WHERE l.id=$1 AND l.user_id=$2',imgs,col,lib) INTO payload USING p_item_id,uid;
 END IF;
 IF payload IS NULL THEN RAISE EXCEPTION 'Library access denied' USING ERRCODE='42501'; END IF;
 rev:=pg_catalog.md5(payload::text);
 IF old_data IS NOT NULL AND NOT p_refresh THEN
  RETURN jsonb_build_object('data',old_data,'revision',old_rev,'version',version,'latest_revision',rev);
 END IF;
 IF p_refresh AND (p_expected_revision IS NULL OR p_expected_revision IS DISTINCT FROM rev) THEN
  RAISE EXCEPTION 'Source changed; inspect again' USING ERRCODE='40001';
 END IF;
 IF old_data IS NULL OR old_data IS DISTINCT FROM payload THEN
  version:=version+1;
  EXECUTE format('UPDATE public.%I SET snapshot_data=$3,snapshot_revision=$4,snapshot_version=$5 WHERE portfolio_id=$1 AND %I=$2',rel,col)
   USING p_portfolio_id,p_item_id,payload,rev,version;
 END IF;
 RETURN jsonb_build_object('data',payload,'revision',rev,'version',version,'latest_revision',rev);
END $$;
REVOKE ALL ON FUNCTION public.capture_portfolio_item_snapshot(uuid,text,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.capture_portfolio_item_snapshot(uuid,text,uuid,boolean,text) TO authenticated;
create or replace function public.replace_portfolio_selection(
  p_portfolio_id uuid,
  p_section text,
  p_item_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_library text;
  v_relation text;
  v_column text;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Serialize edits to the same portfolio and verify ownership before writing.
  perform 1 from public.portfolios
    where id = p_portfolio_id and user_id = v_user_id for update;
  if not found then
    raise exception 'Portfolio not found or access denied' using errcode = '42501';
  end if;

  case p_section
    when 'education' then
      v_library := 'user_library_educations';
      v_relation := 'portfolio_educations';
      v_column := 'education_id';
    when 'activity' then
      v_library := 'user_library_activities';
      v_relation := 'portfolio_activities';
      v_column := 'activity_id';
    when 'certificate' then
      v_library := 'user_library_certificates';
      v_relation := 'portfolio_certificates';
      v_column := 'certificate_id';
    else raise exception 'Invalid section' using errcode = '22023';
  end case;

  if p_item_ids is null or array_position(p_item_ids, null) is not null then
    raise exception 'Item IDs must be a non-null array' using errcode = '22023';
  end if;
  if cardinality(p_item_ids) <> (select count(distinct item) from unnest(p_item_ids) item) then
    raise exception 'Duplicate item IDs' using errcode = '22023';
  end if;

  execute format('select count(*) from public.%I where user_id = $1 and id = any($2)', v_library)
    into v_count using v_user_id, p_item_ids;
  if v_count <> cardinality(p_item_ids) then
    raise exception 'Library item not found or access denied' using errcode = '42501';
  end if;

  execute format('delete from public.%I where portfolio_id = $1 and not (%I = any($2))', v_relation, v_column)
    using p_portfolio_id, p_item_ids;
  execute format(
    'insert into public.%I (portfolio_id, %I, sort_order) select $1, item, (position - 1)::integer from unnest($2::uuid[]) with ordinality as selection(item, position) on conflict (portfolio_id, %I) do update set sort_order=excluded.sort_order',
    v_relation, v_column, v_column
  ) using p_portfolio_id, p_item_ids;
  perform public.capture_portfolio_item_snapshot(p_portfolio_id,p_section,item) from unnest(p_item_ids) item;
end;
$$;
revoke all on function public.replace_portfolio_selection(uuid, text, uuid[]) from public;
revoke all on function public.replace_portfolio_selection(uuid, text, uuid[]) from anon;
grant execute on function public.replace_portfolio_selection(uuid, text, uuid[]) to authenticated;
COMMIT;
