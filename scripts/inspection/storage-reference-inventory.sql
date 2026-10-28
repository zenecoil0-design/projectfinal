-- Aggregate inspection only. Run as an authorized database administrator.
-- Does not identify orphan files or authorize removal. Counts include shared/hidden references.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
WITH reference_counts AS (
SELECT 'covers.cover_image_url' AS source, count(*) FILTER (WHERE nullif(btrim(cover_image_url), '') IS NOT NULL) AS reference_count FROM public.covers
UNION ALL
SELECT 'profiles.profile_image_url' AS source, count(*) FILTER (WHERE nullif(btrim(profile_image_url), '') IS NOT NULL) AS reference_count FROM public.profiles
UNION ALL
SELECT 'certificates.image_url' AS source, count(*) FILTER (WHERE nullif(btrim(image_url), '') IS NOT NULL) AS reference_count FROM public.certificates
UNION ALL
SELECT 'user_library_certificates.image_url' AS source, count(*) FILTER (WHERE nullif(btrim(image_url), '') IS NOT NULL) AS reference_count FROM public.user_library_certificates
UNION ALL
SELECT 'user_library_activity_images.image_url' AS source, count(*) FILTER (WHERE nullif(btrim(image_url), '') IS NOT NULL) AS reference_count FROM public.user_library_activity_images
UNION ALL
SELECT 'user_library_certificate_images.image_url' AS source, count(*) FILTER (WHERE nullif(btrim(image_url), '') IS NOT NULL) AS reference_count FROM public.user_library_certificate_images
UNION ALL
SELECT 'user_library_educations.logo_url' AS source, count(*) FILTER (WHERE nullif(btrim(logo_url), '') IS NOT NULL) AS reference_count FROM public.user_library_educations
UNION ALL
SELECT 'activities.images', count(*) FILTER (WHERE nullif(btrim(image), '') IS NOT NULL) FROM public.activities CROSS JOIN LATERAL unnest(images) AS image
), permission_check AS (
 SELECT rolsuper OR rolbypassrls AS can_inspect_all_rows FROM pg_roles WHERE rolname = current_user
)
SELECT jsonb_build_object(
 'status', CASE WHEN coalesce((SELECT can_inspect_all_rows FROM permission_check), false)
   THEN 'INVENTORY_ONLY_NOT_DELETE_APPROVAL' ELSE 'INCOMPLETE_RLS_VISIBILITY' END,
 'reference_counts', (SELECT jsonb_agg(jsonb_build_object('source', source, 'count', reference_count) ORDER BY source) FROM reference_counts),
 'storage_object_count', (SELECT count(*) FROM storage.objects),
 'deletion_authorized', false
) AS inventory;
COMMIT;
