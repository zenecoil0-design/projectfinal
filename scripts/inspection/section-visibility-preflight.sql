-- Metadata only. No application rows, credentials, function bodies or migration bodies.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
WITH relations AS (
  SELECT c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
         pg_get_userbyid(c.relowner) AS owner, c.relacl
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('portfolios', 'portfolio_section_visibility')
), roles AS (
  SELECT oid, rolname, rolsuper, rolbypassrls FROM pg_roles
  WHERE rolname IN ('anon', 'authenticated')
)
SELECT jsonb_build_object(
  'database', current_database(), 'metadata_role', current_user,
  'relations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', relname, 'kind', relkind, 'rls', relrowsecurity,
    'force_rls', relforcerowsecurity, 'owner', owner)) FROM relations), '[]'::jsonb),
  'columns', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'table', r.relname, 'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
    'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid)))
    FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attnum > 0 AND NOT a.attisdropped
      AND (r.relname = 'portfolio_section_visibility' OR a.attname IN ('id','user_id'))), '[]'::jsonb),
  'constraints', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'table', r.relname, 'name', c.conname, 'kind', c.contype,
    'definition', pg_get_constraintdef(c.oid), 'validated', c.convalidated))
    FROM relations r JOIN pg_constraint c ON c.conrelid = r.oid), '[]'::jsonb),
  'indexes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'table', r.relname, 'valid', i.indisvalid, 'unique', i.indisunique,
    'definition', pg_get_indexdef(i.indexrelid)))
    FROM relations r JOIN pg_index i ON i.indrelid = r.oid), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('portfolios','portfolio_section_visibility')), '[]'::jsonb),
  'roles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', rolname, 'superuser', rolsuper, 'bypass_rls', rolbypassrls,
    'public_usage', has_schema_privilege(oid, 'public', 'USAGE'),
    'auth_usage', CASE WHEN to_regnamespace('auth') IS NOT NULL
      THEN has_schema_privilege(oid, 'auth', 'USAGE') ELSE false END,
    'auth_uid_execute', CASE WHEN to_regprocedure('auth.uid()') IS NOT NULL
      THEN has_function_privilege(oid, to_regprocedure('auth.uid()'), 'EXECUTE') ELSE false END,
    'portfolios_select', CASE WHEN to_regclass('public.portfolios') IS NOT NULL
      THEN has_table_privilege(oid, to_regclass('public.portfolios'), 'SELECT') ELSE false END)) FROM roles), '[]'::jsonb),
  'table_acl', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'table', r.relname, 'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
      ELSE pg_get_userbyid(acl.grantee) END, 'privilege', acl.privilege_type,
    'grantable', acl.is_grantable)) FROM relations r,
    LATERAL aclexplode(COALESCE(r.relacl, acldefault('r', (SELECT relowner FROM pg_class WHERE oid = r.oid)))) acl), '[]'::jsonb),
  'effective_table_privileges', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'table', r.relname, 'role', roles.rolname,
    'select', has_table_privilege(roles.oid, r.oid, 'SELECT'),
    'insert', has_table_privilege(roles.oid, r.oid, 'INSERT'),
    'update', has_table_privilege(roles.oid, r.oid, 'UPDATE'),
    'delete', has_table_privilege(roles.oid, r.oid, 'DELETE')))
    FROM relations r CROSS JOIN roles), '[]'::jsonb),
  'role_memberships', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'member', pg_get_userbyid(m.member), 'granted_role', pg_get_userbyid(m.roleid),
    'admin_option', m.admin_option)) FROM pg_auth_members m
    WHERE m.member IN (SELECT oid FROM roles) OR m.roleid IN (SELECT oid FROM roles)), '[]'::jsonb),
  'default_acl', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'owner', pg_get_userbyid(d.defaclrole), 'schema', n.nspname,
    'object_type', d.defaclobjtype, 'acl', d.defaclacl::text))
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE d.defaclnamespace = 0 OR n.nspname = 'public'), '[]'::jsonb),
  'pgrst_db_schemas_session', current_setting('pgrst.db_schemas', true),
  'pgrst_db_schemas_role_database', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'role', CASE WHEN s.setrole = 0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
    'database', CASE WHEN s.setdatabase = 0 THEN 'ALL' ELSE (SELECT datname FROM pg_database WHERE oid = s.setdatabase) END,
    'setting', setting)) FROM pg_db_role_setting s,
    LATERAL unnest(s.setconfig) setting WHERE setting LIKE 'pgrst.db_schemas=%'), '[]'::jsonb),
  'history_present', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'history_columns', COALESCE((SELECT jsonb_agg(column_name) FROM information_schema.columns
    WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'), '[]'::jsonb)
);
COMMIT;
