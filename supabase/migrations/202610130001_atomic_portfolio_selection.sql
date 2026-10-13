-- Requires the existing library and portfolio relation tables used by the app.
-- One RPC call is one transaction: a failed insert rolls the delete back.
begin;
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

  execute format('delete from public.%I where portfolio_id = $1', v_relation)
    using p_portfolio_id;
  execute format(
    'insert into public.%I (portfolio_id, %I, sort_order) select $1, item, (position - 1)::integer from unnest($2::uuid[]) with ordinality as selection(item, position)',
    v_relation, v_column
  ) using p_portfolio_id, p_item_ids;
end;
$$;
revoke all on function public.replace_portfolio_selection(uuid, text, uuid[]) from public;
revoke all on function public.replace_portfolio_selection(uuid, text, uuid[]) from anon;
grant execute on function public.replace_portfolio_selection(uuid, text, uuid[]) to authenticated;
commit;
