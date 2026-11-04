# Snapshot release runbook — prepared, not approved for hosted installation

Updated 5 November 2026. This is an operator checklist, not an instruction to install now.

## Owner-run acceptance — 5 November 2026

At `6484b3560394fa2a027d1f80ac13b795c4fdf5fb`, the owner ran both suites in Ubuntu/WSL using Docker Engine 29.9.2 and Compose 5.6.1 and supplied the complete console results:

- Generated migration consistency check: PASS.
- Snapshot release migration through real PostgreSQL/PostgREST: **24/24 PASS in one run, exit 0**. The runner applied eight setup steps, including the generated release migration. Includes owner isolation, concurrent acceptance/row-lock races, rollback, retained editions/copies and deletion semantics.
- Real Storage HTTP and physical file-byte checks: **7/7 PASS in a separate run, exit 0**. Includes fresh upload/read, owner/anon restrictions, denied overwrite/upsert/move, delete leaving the original readable, and new-file upload retaining the old bytes.

These are two separate suites, not a single 31-case run. Evidence was executed on the owner's machine and reported in chat, not rerun in the assistant environment. No hosted migration, live Auth, hosted Storage or full browser integration is established by these results.

Follow-up: the WEBP compatibility mismatch is corrected in the atomic uploader and upload-reference SQL, with focused unit/PGlite coverage. The generated release migration has been updated. See [WEBP verification](verification/SNAPSHOT_WEBP_REVIEW.md). The earlier owner-run PNG Storage and API results apply to commit 6484b35; they are not real-service WEBP coverage or acceptance of the revised bundle.



## Exact release inputs

1. Prerequisite: `supabase/migrations/20261023150558_library_image_limits.sql` (if absent after catalog review). Do not replay it when already installed: compare function/trigger definitions and migration history first.
2. Snapshot bundle: `supabase/migrations/20261104123719_portfolio_snapshot_release.sql`.
3. Frontend at the reviewed branch revision with atomic library callers, preparation gate, snapshot reader and manual acceptance.
4. Private asset configuration using the approved target's exact public Storage URL base, ending `/storage/v1/object/public/portfolio-images/`.

Existing visibility, portfolio actions and manual-age migrations are prerequisites already observed on the target. Hosted history timestamps differ from repository filenames. **Do not use an unreviewed blanket db push or replay foundation/reset.** Read the target again immediately before the proposed installation.

The new migration file was created using `supabase@3.0.0 migration new portfolio_snapshot_release`; application dependencies/lockfile were not changed. Its contents are generated from the seven tested proposals by:

```bash
node scripts/build/snapshot-migration.mjs --check
```

Use `--write` only when intentionally regenerating and then retest. Source hashes are embedded. The API runner now reads the migration file itself, not seven separate proposal transactions.

## What the bundle does

Adds snapshot columns, capture/prepare/read functions, atomic library update/create and receipts, upload-reference validation/private asset configuration, snapshot-aware copy, client Storage retention policies, and reloads the PostgREST schema cache. All Snapshot changes share one transaction with lock/statement timeouts. The separate image-limit prerequisite has its own transaction.

It does not prepare old portfolios automatically, delete files, populate the asset origin, or enable the frontend flag. Newly added snapshot data remains null until explicit preparation. Duplicate/partial installation stops for inspection. A guard checks key prerequisites but does not replace full schema/grants/policy review.

## Gates before requesting installation approval

- Reconcile catalog, constraints, grants, existing functions/triggers, storage policy names and migration history. Stop on an unexpected/partial installation.
- Re-run isolated PostgreSQL/PostgREST acceptance using this exact migration revision. The owner-run 24/24 at 6484b35 already covered the generated bundle. The WEBP revision changed that bundle afterward, so it still requires acceptance at 926d6fe or a later reviewed revision.
- Test real Storage HTTP behavior in an authorized isolated/staging environment: fresh uploads/read, owner isolation, rejected overwrite/upsert/delete/move, and unchanged bytes of an old retained image after editing/accepting a new version. PGlite storage metadata is not physical Storage acceptance.
- Verify that administrators/service-role/bucket lifecycle jobs will not overwrite/remove retained images. Retention intentionally keeps unused files; cleanup remains a separate operation, never an unsafe client read-then-delete.
- Review the exact two migration files, target and public asset-origin value with the owner. Obtain installation approval only after the above evidence is ready.

## Coordinated cutover after approval

1. Preserve a recoverable database backup through the approved environment procedure and record current app/database versions. Stop active writers and close old editing sessions.
2. Apply only missing, reviewed prerequisites and the Snapshot bundle. Verify transactional success and migration history. Do not infer success from a network timeout; inspect state before retrying.
3. Configure the single private asset origin through an authorized database connection; do not expose the private schema in the Data API or use the synthetic fixture origin. Leave uploads blocked until configured. Validate the origin against the target, not a copied example.
4. Build/deploy the matching frontend with Snapshot enabled and restart/reopen clients. NEXT_PUBLIC flags are build-time configuration for production builds. Do not leave a flag-off frontend writing against the new revoked grants.
5. With approved synthetic sample data, check new library items/uploads, existing portfolio preparation, A/B snapshot preservation, manual acceptance, copy, hidden sections, selection order, and Preview/PDF. Verify failure/retry and two-owner isolation.
6. Confirm retained old image bytes remain readable. Verify delete semantics only on explicitly authorized disposable test items; never use existing user work as test data.
7. Reopen editing only after acceptance; record the actual migration history and app revision without publishing credentials or raw target metadata.

## Failure handling

If the Snapshot transaction fails, verify it rolled back; the earlier image-limit migration may still be installed and must be recorded separately. Do not reset/drop tables or truncate data.

After successful SQL installation, reverting only the frontend flag is **not** a valid rollback: direct library writes have been revoked. Keep editing paused and repair forward, or prepare a separately reviewed compatibility rollback that preserves snapshots/receipts and retained files. Do not restore old grants or drop retention policies merely to make an old app work.

## Evidence at this checkpoint

- Migration-backed fixture plus retention tests: **7/7 PASS**, one run.
- Bundle generation/late-DDL rollback/repeated-install tests: **3/3 PASS**, separate run.
- Full repository TypeScript, scoped ESLint and diff check: PASS.
- No application source change; no new build/browser/PDF result claimed.
- Real API: owner-run PASS 24/24 at 6484b35; see latest evidence above.
- Real Storage HTTP/physical bytes: owner-run PASS 7/7 at 6484b35; see latest evidence above.
- Hosted install and enabled Snapshot: NOT_DONE.

Related: [retention](verification/SNAPSHOT_STORAGE_RETENTION_REVIEW.md), [catalog compatibility](verification/SNAPSHOT_INSTALL_COMPATIBILITY_REVIEW.md), [earlier API evidence](verification/SNAPSHOT_REAL_API_RUNNER_REVIEW.md).

## Storage runtime acceptance prepared 4 November

The initial [isolated Storage runner](../tests/integration/storage/README.md) had seven
real HTTP/file-byte checks. The current runner has eight, adding WEBP MIME/bytes and overwrite protection. Local runner guards passed 3/3; real Storage acceptance
was NOT_RUN at preparation; the owner subsequently passed 7/7 as recorded above. This is not a
hosted test and does not replace the migration-backed Snapshot API run.
