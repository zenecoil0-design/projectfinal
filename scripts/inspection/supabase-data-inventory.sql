-- M00.04: read-only aggregate inventory based on metadata supplied 2026-10-15.
-- Run as project owner in Supabase SQL Editor. Returns counts/metadata, no student rows.
-- This is not a backup, migration, seed or cleanup. No changes are made.
WITH certificate_image_counts AS (
  SELECT c.id, count(i.id) AS images
  FROM public.user_library_certificates c
  LEFT JOIN public.user_library_certificate_images i ON i.certificate_id=c.id
  GROUP BY c.id
), certificate_distinct_urls AS (
  SELECT certificate_id AS id, image_url FROM public.user_library_certificate_images
  WHERE nullif(btrim(image_url), '') IS NOT NULL
  UNION
  SELECT id, image_url FROM public.user_library_certificates
  WHERE nullif(btrim(image_url), '') IS NOT NULL
), certificate_effective_counts AS (
  SELECT c.id,count(u.image_url) AS images FROM public.user_library_certificates c
  LEFT JOIN certificate_distinct_urls u ON u.id=c.id GROUP BY c.id
), activity_image_counts AS (
  SELECT a.id,count(i.id) AS images FROM public.user_library_activities a
  LEFT JOIN public.user_library_activity_images i ON i.activity_id=a.id GROUP BY a.id
), section_counts AS (
  SELECT 'covers' AS section,portfolio_id,count(*) AS rows FROM public.covers GROUP BY portfolio_id
  UNION ALL SELECT 'prefaces',portfolio_id,count(*) FROM public.prefaces GROUP BY portfolio_id
  UNION ALL SELECT 'profiles',portfolio_id,count(*) FROM public.profiles GROUP BY portfolio_id
), section_summary AS (
  SELECT section,
    count(*) FILTER (WHERE portfolio_id IS NOT NULL AND rows>1) AS portfolios_with_duplicate_rows,
    coalesce(sum(rows) FILTER (WHERE portfolio_id IS NULL),0) AS rows_without_portfolio
  FROM section_counts GROUP BY section
), ownership_checks AS (
  SELECT 'activities' AS section,count(*) AS mismatched_relations
  FROM public.portfolio_activities r JOIN public.portfolios p ON p.id=r.portfolio_id
  JOIN public.user_library_activities l ON l.id=r.activity_id WHERE p.user_id IS DISTINCT FROM l.user_id
  UNION ALL
  SELECT 'certificates',count(*) FROM public.portfolio_certificates r
  JOIN public.portfolios p ON p.id=r.portfolio_id JOIN public.user_library_certificates l ON l.id=r.certificate_id
  WHERE p.user_id IS DISTINCT FROM l.user_id
  UNION ALL
  SELECT 'educations',count(*) FROM public.portfolio_educations r
  JOIN public.portfolios p ON p.id=r.portfolio_id JOIN public.user_library_educations l ON l.id=r.education_id
  WHERE p.user_id IS DISTINCT FROM l.user_id
), tag_checks AS (
  SELECT 'activities' AS section,count(*) AS mismatched_tags
  FROM public.user_library_activity_tags r JOIN public.user_library_activities l ON l.id=r.activity_id
  JOIN public.user_tags t ON t.id=r.tag_id WHERE l.user_id IS DISTINCT FROM t.user_id
  UNION ALL
  SELECT 'certificates',count(*) FROM public.user_library_certificate_tags r
  JOIN public.user_library_certificates l ON l.id=r.certificate_id JOIN public.user_tags t ON t.id=r.tag_id
  WHERE l.user_id IS DISTINCT FROM t.user_id
  UNION ALL
  SELECT 'educations',count(*) FROM public.user_library_education_tags r
  JOIN public.user_library_educations l ON l.id=r.education_id JOIN public.user_tags t ON t.id=r.tag_id
  WHERE l.user_id IS DISTINCT FROM t.user_id
)
SELECT jsonb_build_object(
  'captured_at',current_timestamp,
  'row_counts',jsonb_build_object(
    'users',(SELECT count(*) FROM public.users),
    'portfolios',(SELECT count(*) FROM public.portfolios),
    'covers',(SELECT count(*) FROM public.covers),
    'prefaces',(SELECT count(*) FROM public.prefaces),
    'profiles',(SELECT count(*) FROM public.profiles),
    'legacy_activities',(SELECT count(*) FROM public.activities),
    'legacy_certificates',(SELECT count(*) FROM public.certificates),
    'legacy_educations',(SELECT count(*) FROM public.educations),
    'library_activities',(SELECT count(*) FROM public.user_library_activities),
    'library_certificates',(SELECT count(*) FROM public.user_library_certificates),
    'library_educations',(SELECT count(*) FROM public.user_library_educations),
    'activity_images',(SELECT count(*) FROM public.user_library_activity_images),
    'certificate_images',(SELECT count(*) FROM public.user_library_certificate_images),
    'portfolio_activities',(SELECT count(*) FROM public.portfolio_activities),
    'portfolio_certificates',(SELECT count(*) FROM public.portfolio_certificates),
    'portfolio_educations',(SELECT count(*) FROM public.portfolio_educations),
    'tags',(SELECT count(*) FROM public.user_tags),
    'storage_objects',(SELECT count(*) FROM storage.objects WHERE bucket_id='portfolio-images')
  ),
  'image_limits',jsonb_build_object(
    'certificates_over_2_image_rows',(SELECT count(*) FROM certificate_image_counts WHERE images>2),
    'certificates_over_2_distinct_urls_including_legacy',(SELECT count(*) FROM certificate_effective_counts WHERE images>2),
    'certificate_legacy_url_populated',(SELECT count(*) FROM public.user_library_certificates WHERE nullif(btrim(image_url),'') IS NOT NULL),
    'certificates_with_legacy_url_but_no_image_rows',(SELECT count(*) FROM public.user_library_certificates c JOIN certificate_image_counts i ON i.id=c.id WHERE i.images=0 AND nullif(btrim(c.image_url),'') IS NOT NULL),
    'activities_over_4_image_rows',(SELECT count(*) FROM activity_image_counts WHERE images>4),
    'max_certificate_image_rows',(SELECT coalesce(max(images),0) FROM certificate_image_counts),
    'max_activity_image_rows',(SELECT coalesce(max(images),0) FROM activity_image_counts)
  ),
  'optional_fields_populated',jsonb_build_object(
    'activity_date',(SELECT count(*) FROM public.user_library_activities WHERE activity_date IS NOT NULL),
    'organization',(SELECT count(*) FROM public.user_library_activities WHERE nullif(btrim(organization),'') IS NOT NULL),
    'issued_date',(SELECT count(*) FROM public.user_library_certificates WHERE issued_date IS NOT NULL),
    'issued_by',(SELECT count(*) FROM public.user_library_certificates WHERE nullif(btrim(issued_by),'') IS NOT NULL)
  ),
  'invalid_drafts_or_ownership',jsonb_build_object(
    'blank_activity_titles',(SELECT count(*) FROM public.user_library_activities WHERE nullif(btrim(title,E' \t\r\n'),'') IS NULL),
    'blank_certificate_titles',(SELECT count(*) FROM public.user_library_certificates WHERE nullif(btrim(title,E' \t\r\n'),'') IS NULL),
    'portfolios_without_owner',(SELECT count(*) FROM public.portfolios WHERE user_id IS NULL),
    'relations',(SELECT jsonb_agg(to_jsonb(t)) FROM ownership_checks t),
    'tags',(SELECT jsonb_agg(to_jsonb(t)) FROM tag_checks t)
  ),
  'single_section_duplicates',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM section_summary t),'[]'::jsonb),
  'triggers',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (
    SELECT n.nspname AS schema_name,c.relname AS table_name,tg.tgname,tg.tgenabled,
           pg_get_triggerdef(tg.oid) AS definition,pn.nspname AS function_schema,p.proname AS function_name
    FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=tg.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
    WHERE NOT tg.tgisinternal AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users'))
    ORDER BY n.nspname,c.relname,tg.tgname
  ) t),'[]'::jsonb)
) AS inventory_report;
