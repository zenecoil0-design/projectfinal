-- M00: read-only metadata snapshot for the project owner to run in Supabase SQL Editor.
-- Returns one JSON cell. No student records, passwords, keys, auth.users or object URLs.
-- Does not modify schema or data. Review the result before sharing.
SELECT jsonb_build_object(
  'captured_at', current_timestamp,
  'tables', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT n.nspname AS schema_name, c.relname AS table_name,
           c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p')
    ORDER BY 1,2
  ) t),
  'columns', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT table_schema,table_name,column_name,ordinal_position,data_type,
           udt_name,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema IN ('public','storage')
    ORDER BY table_schema,table_name,ordinal_position
  ) t),
  'constraints', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT n.nspname AS schema_name,c.relname AS table_name,con.conname,
           con.contype,pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','storage') ORDER BY 1,2,3
  ) t),
  'indexes', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
    WHERE schemaname IN ('public','storage') ORDER BY 1,2,3
  ) t),
  'policies', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
    FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3
  ) t),
  'table_grants', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT table_schema,table_name,grantee,privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema IN ('public','storage') ORDER BY 1,2,3,4
  ) t),
  'selection_rpc', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
           p.prosecdef AS security_definer,p.proconfig,p.proacl,
           pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='replace_portfolio_selection'
      AND p.prokind='f'
  ) t),
  'buckets', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
    SELECT id,name,public,file_size_limit,allowed_mime_types
    FROM storage.buckets ORDER BY id
  ) t)
) AS metadata_report;
