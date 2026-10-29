-- Read-only aggregate companion to storage-reference-inventory.sql.
-- Missing snapshot schema must fail. This never authorizes deletion.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
WITH snapshots AS (
 SELECT snapshot_data AS data FROM public.portfolio_educations
 UNION ALL SELECT snapshot_data FROM public.portfolio_activities
 UNION ALL SELECT snapshot_data FROM public.portfolio_certificates
), checked AS (
 SELECT data,coalesce(jsonb_typeof(data)='object' AND jsonb_typeof(data->'item')='object'
 AND jsonb_typeof(data->'images')='array',false) AS valid FROM snapshots
), assets AS (
 SELECT data->'item'->'logo_url' AS url FROM checked WHERE valid
 UNION ALL SELECT data->'item'->'image_url' FROM checked WHERE valid
 UNION ALL SELECT image->'image_url' FROM checked
 CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN valid THEN data->'images' ELSE '[]'::jsonb END) image
), defects AS (
 SELECT count(*) AS n FROM checked WHERE NOT valid
 UNION ALL SELECT count(*) FROM assets WHERE url IS NOT NULL AND jsonb_typeof(url) NOT IN ('string','null')
 UNION ALL SELECT count(*) FROM checked CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN valid THEN data->'images' ELSE '[]'::jsonb END) image
 WHERE jsonb_typeof(image) IS DISTINCT FROM 'object' OR jsonb_typeof(image->'image_url') IS DISTINCT FROM 'string'
)
SELECT jsonb_build_object(
 'status',CASE WHEN NOT coalesce((SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user),false)
 THEN 'INCOMPLETE_RLS_VISIBILITY' WHEN (SELECT sum(n) FROM defects)>0 THEN 'INCOMPLETE_SNAPSHOT_DATA'
 ELSE 'INVENTORY_ONLY_NOT_DELETE_APPROVAL' END,
 'snapshot_count',(SELECT count(*) FROM snapshots),
 'reference_count',(SELECT count(*) FROM assets WHERE jsonb_typeof(url)='string' AND nullif(btrim(url #>> '{}'),'') IS NOT NULL),
 'deletion_authorized',false) AS inventory;
COMMIT;
