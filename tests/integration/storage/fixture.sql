-- Empty disposable database only, after the real Storage service initializes its schema.
BEGIN;
DO $$ BEGIN
 IF current_database()<>'storage_integration' OR EXISTS(SELECT 1 FROM storage.buckets) THEN
  RAISE EXCEPTION 'Fresh isolated Storage database required';
 END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
INSERT INTO storage.buckets(id,name,public) VALUES('portfolio-images','portfolio-images',true);
CREATE POLICY fixture_owner ON storage.objects FOR ALL TO authenticated
 USING(bucket_id='portfolio-images' AND split_part(name,'/',1)='users' AND split_part(name,'/',2)=auth.uid()::text)
 WITH CHECK(bucket_id='portfolio-images' AND split_part(name,'/',1)='users' AND split_part(name,'/',2)=auth.uid()::text);
COMMIT;
