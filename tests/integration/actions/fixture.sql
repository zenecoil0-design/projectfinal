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
CREATE TABLE public.portfolios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),title text,template_key text DEFAULT 'classic',theme_color text);
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON portfolios FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON portfolios TO authenticated;
CREATE TABLE public.covers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
CREATE TABLE public.prefaces(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
CREATE TABLE public.profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
CREATE TABLE public.activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
CREATE TABLE public.certificates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
CREATE TABLE public.educations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE);
ALTER TABLE covers ADD COLUMN cover_image_url text;
ALTER TABLE covers ADD COLUMN title text;
ALTER TABLE covers ADD COLUMN subtitle text;
ALTER TABLE covers ADD COLUMN school_name text;
ALTER TABLE covers ADD COLUMN first_name text;
ALTER TABLE covers ADD COLUMN last_name text;
ALTER TABLE prefaces ADD COLUMN content text;
ALTER TABLE prefaces ADD COLUMN signature_name text;
ALTER TABLE profiles ADD COLUMN profile_image_url text;
ALTER TABLE profiles ADD COLUMN first_name text;
ALTER TABLE profiles ADD COLUMN last_name text;
ALTER TABLE profiles ADD COLUMN nickname text;
ALTER TABLE profiles ADD COLUMN date_of_birth text;
ALTER TABLE profiles ADD COLUMN blood_group text;
ALTER TABLE profiles ADD COLUMN address text;
ALTER TABLE profiles ADD COLUMN phone text;
ALTER TABLE profiles ADD COLUMN contact_email text;
ALTER TABLE profiles ADD COLUMN social_links jsonb;
ALTER TABLE profiles ADD COLUMN talents text;
ALTER TABLE profiles ADD COLUMN motto text;
ALTER TABLE profiles ADD COLUMN nationality text;
ALTER TABLE profiles ADD COLUMN ethnicity text;
ALTER TABLE profiles ADD COLUMN religion text;
ALTER TABLE profiles ADD COLUMN school text;
ALTER TABLE profiles ADD COLUMN plan text;
ALTER TABLE profiles ADD COLUMN gpax text;
ALTER TABLE profiles ADD COLUMN custom_fields jsonb;
ALTER TABLE activities ADD COLUMN title text;
ALTER TABLE activities ADD COLUMN description text;
ALTER TABLE activities ADD COLUMN images text[];
ALTER TABLE certificates ADD COLUMN title text;
ALTER TABLE certificates ADD COLUMN description text;
ALTER TABLE certificates ADD COLUMN image_url text;
ALTER TABLE educations ADD COLUMN level text;
ALTER TABLE educations ADD COLUMN school_name text;
ALTER TABLE educations ADD COLUMN major text;
ALTER TABLE educations ADD COLUMN gpa text;
CREATE TABLE user_library_activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),title text);
CREATE TABLE portfolio_activities(portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,activity_id uuid REFERENCES user_library_activities(id) ON DELETE CASCADE,sort_order int DEFAULT 0,PRIMARY KEY(portfolio_id,activity_id));
CREATE TABLE user_library_certificates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),title text);
CREATE TABLE portfolio_certificates(portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,certificate_id uuid REFERENCES user_library_certificates(id) ON DELETE CASCADE,sort_order int DEFAULT 0,PRIMARY KEY(portfolio_id,certificate_id));
CREATE TABLE user_library_educations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),title text);
CREATE TABLE portfolio_educations(portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,education_id uuid REFERENCES user_library_educations(id) ON DELETE CASCADE,sort_order int DEFAULT 0,PRIMARY KEY(portfolio_id,education_id));
ALTER TABLE covers ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON covers FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON covers TO authenticated;
ALTER TABLE prefaces ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON prefaces FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON prefaces TO authenticated;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON profiles FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON profiles TO authenticated;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON activities FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON activities TO authenticated;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON certificates FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON certificates TO authenticated;
ALTER TABLE educations ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON educations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON educations TO authenticated;
ALTER TABLE portfolio_activities ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON portfolio_activities FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON portfolio_activities TO authenticated;
ALTER TABLE portfolio_certificates ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON portfolio_certificates FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON portfolio_certificates TO authenticated;
ALTER TABLE portfolio_educations ENABLE ROW LEVEL SECURITY; CREATE POLICY own_read ON portfolio_educations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())); GRANT SELECT ON portfolio_educations TO authenticated;
INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
INSERT INTO portfolios(id,user_id,title,template_key,theme_color) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Synthetic A','minimal','{"primary":"#A13A50","secondary":"#ABCDEF","text":"#703344"}'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Synthetic B','modern',null);
INSERT INTO covers(portfolio_id,first_name) VALUES('10000000-0000-0000-0000-000000000001','Synthetic Name');
ALTER TABLE user_library_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON user_library_activities FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON user_library_activities TO authenticated;
INSERT INTO user_library_activities(id,user_id,title) VALUES('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Shared synthetic item');
INSERT INTO portfolio_activities(portfolio_id,activity_id,sort_order) VALUES('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',7);
ALTER TABLE user_library_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON user_library_certificates FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON user_library_certificates TO authenticated;
INSERT INTO user_library_certificates(id,user_id,title) VALUES('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Shared synthetic item');
INSERT INTO portfolio_certificates(portfolio_id,certificate_id,sort_order) VALUES('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',7);
ALTER TABLE user_library_educations ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON user_library_educations FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON user_library_educations TO authenticated;
INSERT INTO user_library_educations(id,user_id,title) VALUES('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Shared synthetic item');
INSERT INTO portfolio_educations(portfolio_id,education_id,sort_order) VALUES('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',7);
COMMIT;
