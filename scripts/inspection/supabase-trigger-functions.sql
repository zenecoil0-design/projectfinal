-- Read-only inspection of the three trigger functions reported by the owner.
-- Review definitions for embedded secrets before sharing. This is NOT a backup.
SELECT jsonb_build_object(
  'captured_at', current_timestamp,
  'trigger_functions', coalesce(jsonb_agg(jsonb_build_object(
    'schema_name', n.nspname,
    'function_name', p.proname,
    'identity_arguments', pg_get_function_identity_arguments(p.oid),
    'owner', pg_get_userbyid(p.proowner),
    'security_definer', p.prosecdef,
    'settings', p.proconfig,
    'definition', pg_get_functiondef(p.oid)
  ) ORDER BY p.proname), '[]'::jsonb)
) AS trigger_function_report
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('handle_new_user', 'touch_portfolio_updated_at', 'set_updated_at')
  AND p.prokind = 'f'
  AND p.prorettype = 'pg_catalog.trigger'::regtype;
