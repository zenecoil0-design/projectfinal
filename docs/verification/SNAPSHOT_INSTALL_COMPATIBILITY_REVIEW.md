# Snapshot installation compatibility checkpoint

Date: 2026-11-03. Base: `6e036b390db7b409ea56dc54747b7ee2f700288e`.

## Result

Local API acceptance reported by the owner remains PASS 24/24 at `a9b3ee0`, exit 0. It is not hosted acceptance. Read-only catalog reconciliation is now performed, but installation is **NOT READY**. No hosted write, migration, feature flag, or application source was changed in this checkpoint.

## Read-only findings

Catalog/history inspection found the existing cover-name, visibility, portfolio-action and manual-age migrations. Their hosted timestamps differ from repository filenames; do not replay them by filename alone. Snapshot tables/functions/private configuration and the proposed image-limit triggers were absent at inspection time. Recheck before installation.

The shared synthetic actions fixture is intentionally smaller than the deployed library contract. In particular, education has no title/description columns, study_plan is NOT NULL with an empty-string default, library owners and activity/certificate titles are NOT NULL, and library/image records have created_at timestamps. The snapshot fixture now models these properties without changing the shared actions fixture or copying real data. A new regression creates all three categories using form-shaped payloads and verifies captured fields, timestamps and the default study plan.

This is a targeted column compatibility improvement, not a complete clone of hosted constraints, policies, triggers or Auth/Storage behavior.

Existing Storage policy predicates enforce owner paths but do not establish reference-safe removal or immutable content. Current source search found no Storage remove calls; the atomic uploader creates new paths and cover/profile uploads use upsert:false. This prevents ordinary UI replacement, but does not prove API-level protection from deletion/overwrite. Snapshot file retention therefore remains an installation blocker; physical Storage is not covered by the isolated metadata fixture.

## Validation on this checkpoint

- `node --import tsx --test tests/integration/snapshots/fixture.test.ts tests/integration/snapshots/runner.test.mjs`: 7/7 PASS in one run.
- `node --import tsx --test tests/snapshot-reader.test.ts tests/snapshot-transition-read.test.ts tests/atomic-library-save.test.ts`: 15/15 PASS in a separate run.
- Scoped ESLint and git diff --check: PASS.
- No application change, so no new build/browser/PDF claim.
- The real PostgreSQL/PostgREST runner was not rerun on this changed fixture here; the owner's 24-case result belongs to the earlier fixture. A final real API run is required after the remaining installation contract is finalized.

## Remaining release sequence

1. Protect retained image content against client deletion/overwrite, while preserving new uploads and existing reads. Verify ownership and every reference-writing path; do not add an unsafe client cleanup retry. Physical cleanup stays disabled until its separate safety conditions are met.
2. Finish catalog/constraint/privilege comparison and assemble a new reviewed migration from the tested proposals, including image-limit prerequisites and private asset configuration. Do not rerun foundation/reset or already installed migrations. Do not use the synthetic asset origin in production.
3. Test the exact install bundle and tightened fixture in isolated PostgreSQL/PostgREST. Review advisors and exposed privileges without treating intentional owner-checked RPCs as blanket permission to relax RLS.
4. Prepare one coordinated release: new SQL revokes legacy library writes, so a flag-off old frontend cannot keep saving against it. Stop active writers during cutover; build the matching frontend with the intended flag and verify it before reopening access. Rolling back only the flag is not a valid rollback for revoked legacy permissions.
5. Obtain installation approval for the concrete SQL. After installation, check two-owner isolation, uploads, explicit preparation, edit/accept/copy/delete, hidden sections and PDF with authorized sample data. No arbitrary existing portfolio is prepared automatically.

No target identifiers, raw catalog dump, advisor output or credentials are included in this public report.
