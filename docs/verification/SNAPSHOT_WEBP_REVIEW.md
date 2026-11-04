# Snapshot WEBP compatibility

Base: `9bdda9e2aa8f827ba5b5e2a3a2de901cc8a6b35c`.

Education, Activity and Certificate accept WEBP in the existing library UI. Choosing the original image retains its MIME and bytes. The Snapshot uploader previously rejected this file, while its SQL upload-reference validator excluded `.webp`.

The uploader now maps `image/webp` to a unique `.webp` path and passes the same File and MIME to Storage. The SQL validator accepts that extension while preserving exact origin, owner, source item, UUID filename and owned storage-object checks. JPG/JPEG/PNG remain accepted. Unsupported MIME types and extensions remain rejected. No conversion, new dependency, form validation change, overwrite or cleanup was introduced.

Regenerated `20261104123719_portfolio_snapshot_release.sql` from the proposal with the existing build script. This is an uninstalled release bundle, not a new hosted migration.

## Verification performed

- `node --import tsx --test tests/atomic-library-save.test.ts tests/snapshot-upload-validation.test.ts tests/integration/snapshots/migration.test.mjs`: **15/15 PASS** in one run.
- Tests cover all three sections, identical File/bytes/MIME at the mocked upload boundary, reference passed to the atomic mutation, unsupported MIME rejection before upload, JPG/JPEG/PNG/WEBP owned references in PGlite, invalid extensions, prior origin/owner rejection, complete migration generation, transaction rollback and duplicate-installation guards.
- Scoped ESLint: PASS.
- Production `npm run build -- --webpack` with localhost mock public configuration: PASS. Existing middleware deprecation and webpack cache warnings remain.
- Full-repository TypeScript after build: PASS.
- Migration generator `--check` and `git diff --check`: PASS.

## Limits and next gate

The upload test uses synthetic bytes and a mocked Storage boundary; it is not proof of WEBP image decoding or browser/PDF rendering. PGlite is not hosted acceptance. No browser suite, real Storage runtime, Docker suite or hosted migration was run in this change.

Owner-run Snapshot API **24/24** and real Storage HTTP **7/7** at `6484b35` remain valid evidence for that prior bundle. They must not be relabelled as WEBP or revised-bundle acceptance. Before enabling Snapshot, validate the revised release bundle and an actual WEBP upload/readback on the authorized acceptance environment, then complete the hosted catalog/cutover checks in [the release runbook](../SNAPSHOT_RELEASE_RUNBOOK.md).

No feature flag was enabled and no hosted data or Storage was modified.

## Real-service acceptance extension

After the application fix, the isolated Snapshot API case now checks both PNG and WEBP upload references with the generated migration, including missing-object and wrong-origin rejection. Its total remains 24 cases. The separate Storage suite adds a decodable synthetic 2x2 lossless WEBP, checks HTTP content type and exact downloaded bytes, then denies overwrite and checks the original again. Its expected total is now 8.

The synthetic fixture was decoded successfully with Pillow during preparation. Runner guard tests passed 3/3; scoped ESLint, all three JavaScript syntax checks, migration generation check and diff check passed. Docker prerequisite check returned NOT_RUN because the author environment has no local Docker/Compose. These new real-service cases are prepared, not claimed as passing. No application or SQL changes in this extension; no rebuild was needed.
