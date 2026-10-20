-- ONLY fed into the runner-created, empty local database. Never a hosted seed.
-- psql variable authenticator_password is generated per run, not a real credential.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'section_visibility_integration' THEN
    RAISE EXCEPTION 'Wrong database: stop';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
    OR to_regnamespace('auth') IS NOT NULL THEN
    RAISE EXCEPTION 'Fixture requires a fresh empty database: stop without overwriting';
  END IF;
END $$;
CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS PASSWORD :'authenticator_password';
GRANT anon, authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  template_key text NOT NULL,
  content jsonb NOT NULL
);
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_portfolio_read_own ON public.portfolios
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
GRANT SELECT ON public.portfolios TO authenticated;
INSERT INTO auth.users VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.portfolios VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Synthetic A', 'minimal', '{"text":"รักษาเนื้อหา","selection":["second","first"],"images":["portrait","landscape"]}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Synthetic B', 'modern', '{"text":"Synthetic B content"}'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Synthetic A2', 'classic', '{"text":"Separate portfolio"}');
COMMIT;
-- The unchanged visibility migration is supplied separately by the runner.
