-- Synthetic extension of the existing empty-DB-only actions fixture.
-- Storage metadata here does not stand for physical files or Storage API acceptance.
BEGIN;
ALTER TABLE portfolios ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE FUNCTION public.touch_snapshot_fixture_portfolio() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF TG_OP='DELETE' THEN UPDATE public.portfolios SET updated_at=now() WHERE id=OLD.portfolio_id;
 ELSE UPDATE public.portfolios SET updated_at=now() WHERE id=NEW.portfolio_id; END IF;
 RETURN NULL;
END $$;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,owner_id text NOT NULL,UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
CREATE POLICY fixture_storage_owner ON storage.objects FOR ALL TO authenticated
 USING(bucket_id='portfolio-images' AND split_part(name,'/',1)='users' AND split_part(name,'/',2)=auth.uid()::text)
 WITH CHECK(bucket_id='portfolio-images' AND split_part(name,'/',1)='users' AND split_part(name,'/',2)=auth.uid()::text);
CREATE TABLE user_tags(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),name text NOT NULL);
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_tags ON user_tags FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON user_tags TO authenticated;
INSERT INTO user_tags VALUES('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Own tag'),('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Other tag');
DO $$ DECLARE kind text; plural text; BEGIN
 FOREACH kind IN ARRAY ARRAY['education','activity','certificate'] LOOP
  plural:=CASE kind WHEN 'education' THEN 'educations' WHEN 'activity' THEN 'activities' ELSE 'certificates' END;
  EXECUTE format('ALTER TABLE user_library_%I ADD COLUMN description text NOT NULL DEFAULT '''', ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()',plural);
  EXECUTE format('CREATE TABLE user_library_%I (%I uuid NOT NULL REFERENCES user_library_%I(id) ON DELETE CASCADE,tag_id uuid NOT NULL REFERENCES user_tags(id) ON DELETE CASCADE,PRIMARY KEY(%I,tag_id))',kind||'_tags',kind||'_id',plural,kind||'_id');
  EXECUTE format('ALTER TABLE user_library_%I ENABLE ROW LEVEL SECURITY',kind||'_tags');
  EXECUTE format('CREATE POLICY own_read ON user_library_%I FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM user_library_%I l WHERE l.id=%I AND l.user_id=auth.uid()))',kind||'_tags',plural,kind||'_id');
  EXECUTE format('GRANT SELECT ON user_library_%I TO authenticated',kind||'_tags');
  EXECUTE format('GRANT INSERT,UPDATE,DELETE ON user_library_%I TO authenticated',plural);
  EXECUTE format('CREATE POLICY own_delete ON user_library_%I FOR DELETE TO authenticated USING(user_id=auth.uid())',plural);
  EXECUTE format('CREATE TRIGGER touch_fixture_portfolio AFTER INSERT OR UPDATE OR DELETE ON portfolio_%I FOR EACH ROW EXECUTE FUNCTION touch_snapshot_fixture_portfolio()',plural);
  EXECUTE format('INSERT INTO user_library_%I(id,user_id,title) VALUES(''20000000-0000-0000-0000-000000000002'',''00000000-0000-0000-0000-000000000002'',''Other source'')',plural);
  EXECUTE format('INSERT INTO portfolio_%I(portfolio_id,%I,sort_order) VALUES(''10000000-0000-0000-0000-000000000002'',''20000000-0000-0000-0000-000000000002'',0)',plural,kind||'_id');
  IF kind<>'education' THEN
   EXECUTE format('CREATE TABLE user_library_%I(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),%I uuid NOT NULL REFERENCES user_library_%I(id) ON DELETE CASCADE,image_url text NOT NULL,sort_order integer NOT NULL DEFAULT 0)',kind||'_images',kind||'_id',plural);
   EXECUTE format('ALTER TABLE user_library_%I ENABLE ROW LEVEL SECURITY',kind||'_images');
   EXECUTE format('CREATE POLICY own_read ON user_library_%I FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM user_library_%I l WHERE l.id=%I AND l.user_id=auth.uid()))',kind||'_images',plural,kind||'_id');
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON user_library_%I TO authenticated',kind||'_images');
   EXECUTE format('INSERT INTO user_library_%I(%I,image_url,sort_order) VALUES(''20000000-0000-0000-0000-000000000001'',''legacy-second.png'',1),(''20000000-0000-0000-0000-000000000001'',''legacy-first.png'',0)',kind||'_images',kind||'_id');
  END IF;
 END LOOP;
END $$;
ALTER TABLE user_library_educations ADD COLUMN level text DEFAULT 'School', ADD COLUMN school_name text DEFAULT 'Original school', ADD COLUMN study_plan text, ADD COLUMN gpa numeric, ADD COLUMN start_year text, ADD COLUMN end_year text, ADD COLUMN logo_url text;
ALTER TABLE user_library_activities ADD COLUMN activity_date date, ADD COLUMN organization text;
ALTER TABLE user_library_certificates ADD COLUMN issued_date date, ADD COLUMN issued_by text, ADD COLUMN image_url text;
-- Match observed library column contracts without copying target data.
-- The shared actions fixture deliberately starts smaller; only this suite tightens it.
ALTER TABLE user_library_educations DROP COLUMN title, DROP COLUMN description;
ALTER TABLE user_library_educations
 ALTER COLUMN level SET NOT NULL, ALTER COLUMN level SET DEFAULT '',
 ALTER COLUMN school_name SET NOT NULL, ALTER COLUMN school_name SET DEFAULT '';
UPDATE user_library_educations SET study_plan='' WHERE study_plan IS NULL;
ALTER TABLE user_library_educations ALTER COLUMN study_plan SET DEFAULT '', ALTER COLUMN study_plan SET NOT NULL;
DO $$ DECLARE plural text; kind text; BEGIN
 FOREACH plural IN ARRAY ARRAY['educations','activities','certificates'] LOOP
  EXECUTE format('ALTER TABLE user_library_%I ALTER COLUMN user_id SET NOT NULL, ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()',plural);
 END LOOP;
 FOREACH kind IN ARRAY ARRAY['activity','certificate'] LOOP
  plural:=CASE kind WHEN 'activity' THEN 'activities' ELSE 'certificates' END;
  EXECUTE format('ALTER TABLE user_library_%I ALTER COLUMN title SET NOT NULL',plural);
  EXECUTE format('ALTER TABLE user_library_%I ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()',kind||'_images');
 END LOOP;
END $$;
COMMIT;
