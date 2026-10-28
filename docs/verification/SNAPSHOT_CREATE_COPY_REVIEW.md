# Snapshot creation and portfolio duplication — 29 October 2026

Branch: `codex/portfolio-next-phase`. Base: `9855995b4752bd215080e5c2763674890d534976`.

## Status

Two more database contracts are implemented and tested in the isolated PGlite model. **Neither is installed on hosted infrastructure or connected to the website.** Snapshot remains IN_PROGRESS; no end-to-end SNP case is marked PASS from these tests.

## Atomic creation

`supabase/proposals/atomic-library-create.sql` extends the preceding [atomic update prototype](SNAPSHOT_ATOMIC_LIBRARY_UPDATE_REVIEW.md):

- The caller supplies one stable item UUID generated before uploading. A single RPC inserts the source and invokes the shared update/validation routine to commit text, logo URL, image rows and tag links together.
- A late error rolls back the source, images, tags and receipt together. No empty library row is left behind by this database operation.
- A receipt keyed by authenticated owner and item UUID records the section and SHA-256 request fingerprint. Same arguments replay the confirmed result without inserting again; different arguments with that key are rejected.
- Plain INSERT never upserts over an existing item. Request values cannot select another owner or inject system fields.
- Receipt reads are owner-scoped by RLS. Direct receipt mutations and anonymous RPC calls are denied.
- Receipts intentionally have no source foreign key: replay after deletion confirms the historical create but **does not recreate** the item. The future UI must read current item existence before opening it; `confirmed` alone does not mean it still exists.
- Replaying a create after subsequent edits does not revert those edits. A failed transaction leaves no receipt, allowing a deliberate same-key retry after the failure is resolved.

This does not make Storage uploads transactional. No upload adapter or physical-file cleanup is added here. New URL origin/path/object validation remains a prerequisite, so this proposal must not be installed as-is.

## Copying the captured edition

`supabase/proposals/snapshot-portfolio-copy.sql` replaces the existing action function in the local prototype, based on its latest manual-age definition:

- Copy snapshot payload, revision and accepted-version counter alongside each source ID and selection order in all three sections.
- Never call capture during duplication and never substitute latest library content for the source portfolio's edition.
- Preserve the existing request receipt, owner checks and transaction boundary, plus template, three-color value, content, manual age and visibility handling.
- If any selected item has no snapshot yet, stop and roll back before copying. This is a transition guard, not an implemented old-portfolio backfill; the UI still needs a clear preparation/recovery path before activation.
- A copied portfolio can accept a newer library edition independently. Library deletion still cascades through original and copied references, including hidden sections. Deleting the copy leaves the source portfolio and library intact.

## Evidence from this round

- Initial focused create/copy plus atomic-update tests: **10/10 PASS** in one run, 14.8 seconds.
- After adding multiple selected items, version-two retention and changed source-image assertions: **24/24 PASS** in one combined run, 18.4 seconds. Includes snapshot foundation, atomic update, lifecycle, selection, action DB and manual-age regression. The earlier ten are not ten additional distinct cases.
- Full-repository TypeScript: PASS after final test edits.
- Scoped ESLint: PASS, zero errors/warnings in the three touched test/helper files.
- `git diff --check`: PASS. Relative report links checked.

Failure injection occurs after source/image writes during creation and after copied snapshot rows during duplication. Tests check rollback, receipt absence, deliberate recovery and replay, not just the returned status. Copy fixtures include two selected items per section, old image order after source image changes, an accepted version of two, hidden activity/TOC, three colors and manual age zero.

The prior update fixture was extracted into `tests/helpers/snapshot.ts` without removing its assertions. These tests use synthetic schemas/objects; they do not prove Storage ownership, actual upload behavior, hosted RLS, API concurrency or browser behavior. No application source changed, so no build/browser/PDF rerun was needed.

## Remaining before use

1. Validate newly uploaded assets and connect upload-before-commit, create/update callers, stable-key persistence and uncertain-result verification. UI must not automatically generate a different create key after a lost response.
2. Finalize payload readers and transition existing selections, then connect Editor notices/manual acceptance, Preview and PDF.
3. Verify actual catalog/grants and turn the tested contracts into generated migrations. Preserve newer definitions if target differs; do not re-run the old foundation migrations.
4. Run real PostgreSQL/PostgREST concurrent save/capture/copy/delete tests and resolve lock ordering before deployment. PGlite replay tests do not prove simultaneous-session behavior.
5. Include every snapshot asset in Storage reference checks before cleanup.

No hosted database/Storage write, migration installation, deployment, reset or data deletion occurred. Autosave and per-portfolio image subsets remain REMOVED.
