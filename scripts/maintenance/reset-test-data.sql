-- DESTRUCTIVE: owner authorized discarding test data on 2026-10-15.
-- Run ONLY in the Portfolio project's SQL Editor, with all app tabs/writers stopped.
-- Keeps auth users, public.users, schema, policies, triggers, bucket and Auth settings.
-- Storage files must be removed separately through Storage UI/API, never by SQL.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Explicit list, without CASCADE: an unexpected external FK aborts the transaction.
LOCK TABLE public.activities, public.certificates, public.educations,
  public.covers, public.prefaces, public.profiles,
  public.portfolio_activities, public.portfolio_certificates, public.portfolio_educations,
  public.portfolios, public.user_library_activity_tags, public.user_library_certificate_tags,
  public.user_library_education_tags, public.user_library_activity_images,
  public.user_library_certificate_images, public.user_library_activities,
  public.user_library_certificates, public.user_library_educations, public.user_tags
IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  -- Fail closed if the dataset has grown beyond the inventory the owner reviewed.
  IF (SELECT count(*) FROM public.portfolios) > 14
    OR (SELECT count(*) FROM public.user_library_activities) > 7
    OR (SELECT count(*) FROM public.user_library_certificates) > 4
    OR (SELECT count(*) FROM public.user_library_educations) > 3
    OR (SELECT count(*) FROM public.user_tags) > 2 THEN
    RAISE EXCEPTION 'Inventory changed: review new test data before resetting';
  END IF;
END $$;

TRUNCATE TABLE public.activities, public.certificates, public.educations,
  public.covers, public.prefaces, public.profiles,
  public.portfolio_activities, public.portfolio_certificates, public.portfolio_educations,
  public.portfolios, public.user_library_activity_tags, public.user_library_certificate_tags,
  public.user_library_education_tags, public.user_library_activity_images,
  public.user_library_certificate_images, public.user_library_activities,
  public.user_library_certificates, public.user_library_educations, public.user_tags;
COMMIT;

SELECT jsonb_build_object(
  'portfolios', (SELECT count(*) FROM public.portfolios),
  'activities', (SELECT count(*) FROM public.user_library_activities),
  'certificates', (SELECT count(*) FROM public.user_library_certificates),
  'educations', (SELECT count(*) FROM public.user_library_educations),
  'tags', (SELECT count(*) FROM public.user_tags),
  'public_users_kept', (SELECT count(*) FROM public.users),
  'auth_users_kept', (SELECT count(*) FROM auth.users),
  'storage_objects_pending', (SELECT count(*) FROM storage.objects WHERE bucket_id='portfolio-images')
) AS reset_report;
