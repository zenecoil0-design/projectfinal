-- PROPOSAL ONLY: review/install together with Snapshot cutover, not automatically.
-- Keep all portfolio images immutable for ordinary clients. Cleanup is separate.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='storage' AND c.relname='objects' AND c.relrowsecurity) THEN
  RAISE EXCEPTION 'Storage objects with RLS required' USING ERRCODE='55000';
 END IF;
END $$;
-- Restrictive policies AND with existing permissive owner policies. They grant nothing.
-- PUBLIC covers every non-bypass role, even if a broad permissive policy is added later.
CREATE POLICY portfolio_images_immutable_update ON storage.objects
 AS RESTRICTIVE FOR UPDATE TO PUBLIC
 USING (bucket_id <> 'portfolio-images')
 WITH CHECK (bucket_id <> 'portfolio-images');
CREATE POLICY portfolio_images_retained_delete ON storage.objects
 AS RESTRICTIVE FOR DELETE TO PUBLIC
 USING (bucket_id <> 'portfolio-images');
-- SELECT / INSERT remain governed by existing policies. Other buckets are unchanged.
-- Owner/BYPASSRLS/service-role access is not blocked; never use it in the browser.
-- No physical file deletion, metadata mutation, or existing policy removal here.
COMMIT;
