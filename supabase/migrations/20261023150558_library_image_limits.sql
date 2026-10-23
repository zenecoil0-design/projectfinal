-- Prepared only. Do not install on hosted target without separate approval.
-- Existing over-limit rows are preserved: enforce additions, not a table CHECK.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE FUNCTION public.enforce_library_image_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  parent_table text;
  parent_column text;
  parent_id uuid;
  locked_parent uuid;
  image_limit integer;
  image_count integer;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'user_library_activity_images' THEN
      parent_table := 'user_library_activities'; parent_column := 'activity_id'; image_limit := 4;
    WHEN 'user_library_certificate_images' THEN
      parent_table := 'user_library_certificates'; parent_column := 'certificate_id'; image_limit := 2;
    ELSE RAISE EXCEPTION 'Unsupported image relation' USING ERRCODE = '22023';
  END CASE;
  parent_id := (to_jsonb(NEW)->>parent_column)::uuid;
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD)->>parent_column)::uuid = parent_id THEN
    RETURN NEW; -- Existing image/order edits do not add images, including legacy >2.
  END IF;
  -- Serialize additions against this source. RLS remains in force (no definer).
  EXECUTE format('SELECT id FROM public.%I WHERE id=$1 FOR UPDATE', parent_table) INTO locked_parent USING parent_id;
  IF locked_parent IS NULL THEN RAISE EXCEPTION 'Source unavailable' USING ERRCODE = '42501'; END IF;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1', TG_TABLE_NAME, parent_column)
    INTO image_count USING parent_id;
  IF image_count >= image_limit THEN
    RAISE EXCEPTION 'Image limit exceeded' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_library_image_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER activity_image_limit BEFORE INSERT OR UPDATE OF activity_id
  ON public.user_library_activity_images FOR EACH ROW EXECUTE FUNCTION public.enforce_library_image_limit();
CREATE TRIGGER certificate_image_limit BEFORE INSERT OR UPDATE OF certificate_id
  ON public.user_library_certificate_images FOR EACH ROW EXECUTE FUNCTION public.enforce_library_image_limit();
COMMIT;
