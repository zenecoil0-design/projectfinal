# Snapshot image retention proposal

Checkpoint: 4 November 2026. Base: `3e54f699a593fb4c189f6b9d909bfaed7b981d07`.

## Change and tradeoff

Added `supabase/proposals/snapshot-storage-retention.sql`, not an installed migration. Two restrictive RLS policies disallow UPDATE and DELETE of objects in `portfolio-images` for ordinary roles. The UPDATE check also blocks moving an object from another bucket into this bucket. SELECT and INSERT continue to require existing permissions; the proposal grants no access and changes no other bucket permissions. It stops if storage.objects does not have RLS enabled and does not silently replace existing policies with matching names.

The entire bucket is retained, including unused objects, rather than trying to read references and delete afterwards. This removes the client reference-check/delete race at the cost of retained storage usage. It covers cover/profile images and shared legacy image URLs as well as library snapshots. This is not reference-safe cleanup and does not implement cleanup retry. Existing UI removes a reference without claiming to delete the physical file. No automatic physical cleanup is introduced.

Current application search found no Storage remove calls. Cover/Profile upload with upsert:false; the atomic library uploader generates a new UUID path and does not use upsert. Existing client upload paths must still be checked through the real Storage service at cutover.

Restrictive policies combine with permissive policies using AND. They remain effective even when a broad permissive rule exists. They do not constrain table owners, privileged BYPASSRLS roles, service-role requests, administrators or external bucket lifecycle jobs. Those must not remove or overwrite retained files. This proposal does not guarantee retention of externally hosted legacy URLs.

## Checks performed

One combined run:

`node --import tsx --test tests/snapshot-storage-retention.test.ts tests/integration/snapshots/fixture.test.ts tests/snapshot-upload-validation.test.ts`

**10/10 PASS**, no skip. Includes reads/new inserts, rejected overwrites/upserts/renames/bucket moves, zero-row client deletion, owner/anon isolation, another bucket remaining writable under its existing policy, an extra permissive grant not bypassing retention, installation preconditions, and privileged maintenance explicitly outside the guarantee. Snapshot fixture preparation/capture/copy and owned upload validation still pass with the retention policies loaded.

Full-repository TypeScript, scoped ESLint and git diff --check passed. No application source changed, so no new build/browser/PDF run is claimed. Dependencies were restored using the existing lockfile with npm ci --ignore-scripts; no manifest or lockfile change.

These tests use PGlite and synthetic Storage metadata. They do not perform a real Storage HTTP upload/delete or check physical file bytes. The real PostgreSQL/PostgREST owner-run 24/24 result belongs to the earlier proposal set, not this revision. The updated runner now loads this proposal; its real API rerun remains pending.

## Before installation

- Include this proposal in the reviewed Snapshot cutover bundle; do not paste individual proposals into hosted SQL independently.
- Recheck the target RLS/policies/roles and existing names. Preserve unrelated bucket policies and grants.
- Verify real Storage new upload/read, overwrite/upsert rejection, rename/move/delete rejection, two-owner isolation, and byte identity of the old image after accepting a new version. SQL metadata tests alone cannot establish Storage service behavior.
- Keep service-role/admin cleanup disabled during capture/reference writes. No client cleanup button should claim safety from these policies.
- Coordinate the frontend switch with the atomic-library grants change. Do not simply roll back the Snapshot flag after revoking legacy writes.
- Obtain approval for the final installation. No hosted mutation, feature flag change, migration application or physical deletion occurred in this checkpoint.

## References

- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control): INSERT for uploads, SELECT/UPDATE for upsert; service keys bypass RLS.
- [PostgreSQL 17 CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html): restrictive rules combine with AND; USING and WITH CHECK apply to old/new rows.
- [Installation compatibility](SNAPSHOT_INSTALL_COMPATIBILITY_REVIEW.md)
