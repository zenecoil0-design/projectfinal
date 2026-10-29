-- LOCAL PROTOTYPE ONLY. Configure the private public-URL base before testing.
-- Does not grant Storage deletion or guarantee concurrent file retention.
BEGIN;
CREATE SCHEMA IF NOT EXISTS portfolio_private;
REVOKE ALL ON SCHEMA portfolio_private FROM PUBLIC,anon,authenticated;
CREATE TABLE portfolio_private.asset_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 public_base_url text NOT NULL CHECK(public_base_url ~ '^https://[^/?#]+/storage/v1/object/public/portfolio-images/$')
);
REVOKE ALL ON portfolio_private.asset_config FROM PUBLIC,anon,authenticated;
CREATE FUNCTION portfolio_private.validate_library_upload() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); owner_id uuid; item_id uuid; section_path text;
 asset_url text; base_url text; object_path text; prefix text; found_object uuid;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'user_library_educations' THEN
  owner_id:=NEW.user_id; item_id:=NEW.id; section_path:='education'; asset_url:=NEW.logo_url;
  IF TG_OP='UPDATE' AND NEW.logo_url IS NOT DISTINCT FROM OLD.logo_url THEN RETURN NEW; END IF;
 WHEN 'user_library_activity_images' THEN
  item_id:=NEW.activity_id; section_path:='activities'; asset_url:=NEW.image_url;
  SELECT user_id INTO owner_id FROM public.user_library_activities WHERE id=item_id;
  IF TG_OP='UPDATE' AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url AND NEW.activity_id=OLD.activity_id THEN RETURN NEW; END IF;
 WHEN 'user_library_certificate_images' THEN
  item_id:=NEW.certificate_id; section_path:='certificates'; asset_url:=NEW.image_url;
  SELECT user_id INTO owner_id FROM public.user_library_certificates WHERE id=item_id;
  IF TG_OP='UPDATE' AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url AND NEW.certificate_id=OLD.certificate_id THEN RETURN NEW; END IF;
 ELSE RAISE EXCEPTION 'Unsupported asset writer' USING ERRCODE='22023';
 END CASE;
 IF asset_url IS NULL AND section_path='education' THEN RETURN NEW; END IF;
 IF actor IS NULL OR owner_id IS DISTINCT FROM actor THEN
  RAISE EXCEPTION 'Asset owner mismatch' USING ERRCODE='42501';
 END IF;
 SELECT public_base_url INTO base_url FROM portfolio_private.asset_config WHERE singleton;
 IF base_url IS NULL THEN RAISE EXCEPTION 'Asset origin not configured' USING ERRCODE='55000'; END IF;
 prefix:=base_url||'users/'||actor::text||'/'||section_path||'/'||item_id::text||'/';
 IF asset_url IS NULL OR left(asset_url,length(prefix))<>prefix
 OR substring(asset_url FROM length(prefix)+1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$' THEN
  RAISE EXCEPTION 'Invalid upload reference' USING ERRCODE='22023';
 END IF;
 object_path:=substring(asset_url FROM length(base_url)+1);
 SELECT id INTO found_object FROM storage.objects
  WHERE bucket_id='portfolio-images' AND name=object_path AND storage.objects.owner_id=actor::text
  FOR SHARE;
 IF found_object IS NULL THEN RAISE EXCEPTION 'Owned upload not found' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION portfolio_private.validate_library_upload() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_education_upload BEFORE INSERT OR UPDATE OF logo_url ON public.user_library_educations FOR EACH ROW EXECUTE FUNCTION portfolio_private.validate_library_upload();
CREATE TRIGGER validate_activity_upload BEFORE INSERT OR UPDATE OF image_url,activity_id ON public.user_library_activity_images FOR EACH ROW EXECUTE FUNCTION portfolio_private.validate_library_upload();
CREATE TRIGGER validate_certificate_upload BEFORE INSERT OR UPDATE OF image_url,certificate_id ON public.user_library_certificate_images FOR EACH ROW EXECUTE FUNCTION portfolio_private.validate_library_upload();
COMMIT;
