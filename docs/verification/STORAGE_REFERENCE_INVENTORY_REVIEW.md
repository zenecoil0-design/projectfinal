# Storage reference inventory — 28 October 2026

Base: 34ebcbdc6fa9e67cf8bf406095609edacb162758. Branch: codex/portfolio-next-phase.

Added scripts/inspection/storage-reference-inventory.sql: an administrator-only aggregate inspection in a read-only transaction with a ten-second statement timeout. It counts nonblank references across cover/profile, legacy portfolio activity arrays/certificates, legacy library certificate URL, current library image rows and education logos. No section visibility filter is applied. Output contains only counts/source column names and a non-deletion status, never stored URLs, object paths or student rows.

A role without superuser/BYPASSRLS gets INCOMPLETE_RLS_VISIBILITY. Missing tables or denied SELECT cause SQL failure, not an empty-success report. A successful administrator report is still INVENTORY_ONLY_NOT_DELETE_APPROVAL. Counts are occurrences, not unique files, and must not be subtracted from Storage object count to infer orphans. This is not a complete future-schema discovery tool: recheck catalog when the schema changes.

Validation: PGlite tests 2/2 PASS after correcting a reserved-word SQL alias in the first attempt (initial result 1 pass / 1 failure). Tests cover eight sources, repeated array references, blank/null values, output privacy, limited role status, missing schema failure and unchanged fixture rows. Scoped ESLint and diff check PASS. The final query also executed successfully against the authorized target in a read-only transaction. Target identifiers, counts and raw catalog output are deliberately not included here. No application source change; no build/browser rerun needed.

No files, rows, policies or migration history were changed on the target. This supplies the inventory step only. Reference-safe deletion remains pending: reconcile canonical object identities and every reference, then prevent concurrent reference writers during an approved maintenance operation, or implement a coordinated claim protocol. Do not expose a client cleanup button based on these aggregate counts.

Supabase documentation requires actual file deletion through Storage API rather than SQL deletion from storage.objects: https://supabase.com/docs/guides/storage/management/delete-objects . No deletion API is invoked by this script.

Run synthetic tests: node --test tests/inspection/storage-reference-inventory.test.mjs
Run inspection: use the SQL file with an authorized database administrator. Do not interpret execution errors or the limited-role status as zero references.
