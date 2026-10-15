-- Apply after 202610130001_atomic_portfolio_selection.sql.
-- No row deletion or Storage mutation. Invalid existing data aborts the transaction.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.portfolios ALTER COLUMN user_id SET NOT NULL;

DO $migration$
DECLARE
  section text;
  kind text;
  table_name text;
  ownership text;
  invalid_count bigint;
BEGIN
  -- One cover/profile/preface per portfolio. Existing duplicates fail visibly.
  FOREACH table_name IN ARRAY ARRAY['covers','profiles','prefaces'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN portfolio_id SET NOT NULL', table_name);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, table_name || '_portfolio_id_key');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (portfolio_id)', table_name, table_name || '_portfolio_id_key');
  END LOOP;

  -- Deleting a portfolio removes its sections, never the reusable library.
  FOREACH table_name IN ARRAY ARRAY['covers','profiles','prefaces','activities','certificates','educations'] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_name, table_name || '_portfolio_id_fkey');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE', table_name, table_name || '_portfolio_id_fkey');
  END LOOP;

  FOR kind, section IN SELECT * FROM (VALUES ('activity','activities'), ('certificate','certificates'), ('education','educations')) AS s(kind,section) LOOP
    table_name := 'portfolio_' || section;
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE', table_name);
    EXECUTE format('SELECT count(*) FROM public.%I r JOIN public.portfolios p ON p.id=r.portfolio_id JOIN public.%I l ON l.id=r.%I WHERE p.user_id IS DISTINCT FROM l.user_id', table_name, 'user_library_' || section, kind || '_id') INTO invalid_count;
    IF invalid_count > 0 THEN
      RAISE EXCEPTION 'Cross-owner relations in %; review data before migration', table_name;
    END IF;

    -- Restrictive AND guard: the old permissive ALL policy cannot bypass it.
    ownership := format('EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = %I.portfolio_id AND p.user_id = (SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.%I l WHERE l.id = %I.%I AND l.user_id = (SELECT auth.uid()))', table_name, 'user_library_' || section, table_name, kind || '_id');
    EXECUTE format('DROP POLICY IF EXISTS relation_owners_guard ON public.%I', table_name);
    EXECUTE format('CREATE POLICY relation_owners_guard ON public.%I AS RESTRICTIVE FOR ALL TO public USING (%s) WITH CHECK (%s)', table_name, ownership, ownership);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', table_name || '_source_idx', table_name, kind || '_id');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id)', 'user_library_' || section || '_owner_idx', 'user_library_' || section);
  END LOOP;

  -- Explicit application tables only; Supabase-managed storage/auth are untouched.
  FOREACH table_name IN ARRAY ARRAY[
    'users','portfolios','covers','profiles','prefaces','activities','certificates','educations',
    'portfolio_activities','portfolio_certificates','portfolio_educations',
    'user_library_activities','user_library_certificates','user_library_educations',
    'user_library_activity_images','user_library_certificate_images',
    'user_library_activity_tags','user_library_certificate_tags','user_library_education_tags','user_tags'
  ] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', table_name);
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated', table_name);
  END LOOP;
END
$migration$;

ALTER TABLE public.user_library_activities DROP CONSTRAINT IF EXISTS activity_title_nonblank;
ALTER TABLE public.user_library_activities ADD CONSTRAINT activity_title_nonblank CHECK (title ~ '[^[:space:]]');
ALTER TABLE public.user_library_certificates DROP CONSTRAINT IF EXISTS certificate_title_nonblank;
ALTER TABLE public.user_library_certificates ADD CONSTRAINT certificate_title_nonblank CHECK (title ~ '[^[:space:]]');

-- Existing activity image policies lack UPDATE; allow reordering only own images.
DROP POLICY IF EXISTS activity_images_owner_update ON public.user_library_activity_images;
CREATE POLICY activity_images_owner_update ON public.user_library_activity_images
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_library_activities a WHERE a.id=activity_id AND a.user_id=(SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_library_activities a WHERE a.id=activity_id AND a.user_id=(SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS portfolios_owner_idx ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS activity_images_parent_idx ON public.user_library_activity_images(activity_id);
CREATE INDEX IF NOT EXISTS certificate_images_parent_idx ON public.user_library_certificate_images(certificate_id);

-- Supplied trigger bodies use qualified public tables and built-ins only.
-- Preserve their behavior, including Auth email synchronization and OLD/NEW touches.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.touch_portfolio_updated_at() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user(), public.set_updated_at(), public.touch_portfolio_updated_at() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
