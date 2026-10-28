# Snapshot: atomic library update prototype — 29 October 2026

Branch: `codex/portfolio-next-phase`. Base: `9b82fb543d648b6366298f228427b786971f2fdb`.

## Status

Database prototype tested locally; **not installed and not connected to the application**. The existing website continues using its existing save/read paths. This does not complete Snapshot acceptance or change hosted grants.

The preceding [foundation prototype](SNAPSHOT_FOUNDATION_PROTOTYPE_REVIEW.md) captures text and image rows together but identified that the existing forms commit text, image changes and tags through separate requests. A capture between those requests could preserve a partially completed edit.

## Change

`supabase/proposals/atomic-library-update.sql` adds `update_library_item_atomic` for **updates to existing** Education, Activity and Certificate library items. It remains outside the migration directory. Supabase CLI and Docker were unavailable in this execution environment.

- Lock and verify the source owner before modifying anything; accept only the fields actually used by the corresponding form. Reject ownership/system-field injection and foreign tags.
- Update primary fields, education logo URL, ordered image rows and tag links in the same database transaction. A late error rolls back the entire database update.
- Retained image IDs must belong to that source and retain their URLs. Array order becomes the image order; no replacement of image IDs on a text-only edit.
- New images must fit Activity 4 / Certificate 2. Legacy certificate image sets over two can remain intact, reorder or shrink; no silent truncation. Image-limit triggers remain active.
- Source row `FOR UPDATE` coordinates with capture's `FOR SHARE`. Prototype table grants reject old direct content/image writers; this restriction must not be deployed while the old application callers are still active.
- Existing snapshots remain unchanged until explicit acceptance. A stale update after library deletion fails and never recreates the deleted item.
- No physical file deletion or Storage overwrite is performed.

The function is a privileged entry point with an explicit authenticated owner check, empty search path, whitelisted table/field identifiers, bound values, and revoked PUBLIC/anon execution. It is not a generic arbitrary-table update endpoint.

## Verification in this round

- New PGlite tests: **4/4 PASS** in 12.8 seconds.
- Combined snapshot foundation, atomic update, library lifecycle and selection tests: **12/12 PASS in one run** in 12.9 seconds; no skips. The four tests above are included in this total, not additional distinct tests.
- Full-repository TypeScript: `node_modules/.bin/tsc --noEmit --incremental false` — PASS.
- Scoped ESLint: `node_modules/.bin/eslint tests/atomic-library-update.test.ts` — PASS, no errors/warnings.
- Diff whitespace check — PASS.

Tests deliberately inject a tag-insert failure **after** text and image mutations, then confirm that the source fingerprint, original snapshot and previous tag links all remain unchanged. Successful saves verify text/images arriving together, explicit snapshot acceptance, unchanged-content fingerprint stability, owner isolation, malformed inputs, image limits and deleted-source rejection.

The synthetic baseline was extended with form fields for these tests. Those column types are not a fresh target catalog verification. PGlite does not prove concurrent-session locking, real PostgREST behavior, hosted policies or Storage access. No build/browser/PDF rerun: application source is unchanged.

## Required follow-up before installation

1. Complete atomic **creation** and the upload-before-commit flow. The current prototype only edits existing items. Validate new image/logo URLs against the authorized Storage origin, object owner and upload path; this prototype validates existing image-row ownership but does not yet establish ownership/existence of a newly supplied URL. Do not expose it on hosted infrastructure as-is.
2. Connect all library callers, including failure/uncertain-result recovery. Database rollback does not roll back a prior Storage upload, and a lost response does not prove rollback. Keep uploaded files while an outcome remains uncertain.
3. Verify actual catalog constraints, role and column-level grants and every privileged writer. These prototype revocations do not prove that no target-side bypass exists. Review whether to move privileged implementation into a private schema behind a minimal RPC wrapper.
4. Run isolated real PostgreSQL/PostgREST tests for concurrent save/capture/delete, lock ordering and retry. The capture/delete lock-order risk from the foundation is still open; no concurrent-session claim is made here.
5. Copy original snapshot payloads in portfolio duplication, transition existing portfolios, and connect Editor/Preview/PDF readers and explicit update UI.
6. Add snapshot image references to Storage reconciliation and verify retention before any file cleanup.

No hosted SQL was executed, no migration/deployment/reset was applied, and no real data or Storage object was modified. Autosave and per-portfolio image subsets remain REMOVED.

Follow-up: [atomic creation and snapshot copy](SNAPSHOT_CREATE_COPY_REVIEW.md) adds local contracts/tests for creation receipts and copying captured editions. Upload validation and application integration remain pending; the evidence above remains the result of this earlier round.

## Reference checked

[PostgREST transaction behavior](https://docs.postgrest.org/en/stable/references/transactions.html): each API request has its own transaction and database errors abort that transaction. The Supabase changelog was also read; no extension or HTTP TLS configuration was changed by this local SQL proposal.
