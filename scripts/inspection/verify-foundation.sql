-- Read-only. Run after reset + both migrations + Storage cleanup, before new data.
WITH app_tables AS (
  SELECT unnest(ARRAY[
    'users','portfolios','covers','profiles','prefaces','activities','certificates','educations',
    'portfolio_activities','portfolio_certificates','portfolio_educations',
    'user_library_activities','user_library_certificates','user_library_educations',
    'user_library_activity_images','user_library_certificate_images',
    'user_library_activity_tags','user_library_certificate_tags','user_library_education_tags','user_tags'
  ]) AS name
), grants_ok AS (
  SELECT bool_and(NOT has_table_privilege('anon','public.' || name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    AND NOT has_table_privilege('authenticated','public.' || name,'TRUNCATE,REFERENCES,TRIGGER')) AS ok
  FROM app_tables
)
SELECT jsonb_build_object(
  'captured_at', now(),
  'accounts', jsonb_build_object(
    'auth_users', (SELECT count(*) FROM auth.users),
    'public_users', (SELECT count(*) FROM public.users),
    'auth_without_public_user', (SELECT count(*) FROM auth.users a LEFT JOIN public.users u ON u.id=a.id WHERE u.id IS NULL)
  ),
  'remaining', jsonb_build_object(
    'portfolios', (SELECT count(*) FROM public.portfolios),
    'library_items', (SELECT count(*) FROM public.user_library_activities) + (SELECT count(*) FROM public.user_library_certificates) + (SELECT count(*) FROM public.user_library_educations),
    'sections', (SELECT count(*) FROM public.covers) + (SELECT count(*) FROM public.profiles) + (SELECT count(*) FROM public.prefaces),
    'tags', (SELECT count(*) FROM public.user_tags),
    'storage_objects', (SELECT count(*) FROM storage.objects WHERE bucket_id='portfolio-images')
  ),
  'foundation', jsonb_build_object(
    'safe_table_grants', (SELECT ok FROM grants_ok),
    'rpc_installed', to_regprocedure('public.replace_portfolio_selection(uuid,text,uuid[])') IS NOT NULL,
    'restrictive_relation_policies', (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('portfolio_activities','portfolio_certificates','portfolio_educations') AND policyname='relation_owners_guard' AND permissive='RESTRICTIVE'),
    'single_section_constraints', (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('covers_portfolio_id_key','profiles_portfolio_id_key','prefaces_portfolio_id_key') AND contype='u'),
    'section_cascade_constraints', (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('covers_portfolio_id_fkey','profiles_portfolio_id_fkey','prefaces_portfolio_id_fkey','activities_portfolio_id_fkey','certificates_portfolio_id_fkey','educations_portfolio_id_fkey') AND confdeltype='c'),
    'title_constraints', (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('activity_title_nonblank','certificate_title_nonblank') AND contype='c')
  )
) AS foundation_report;
