# Portfolio actions backend — recovery checkpoint, NOT production-ready

Recovered on top of `26cbc82` after the transient worktree holding unpublished `e67d2b8` disappeared. The newer Classic template work is preserved. The old five-test result does NOT certify this reconstruction.

Prepared migration only: no hosted changes, deployment or Storage deletion. It requires visibility and ten portfolio cascade relationships. The RPC uses auth.uid ownership checks, one transaction, a single statement snapshot of owned sections, shared library references, immutable receipts and an owner/request advisory lock. Request replays return the same receipt; changed arguments are rejected. Missing receipt is uncertain, never evidence of rollback. Explicit column lists must be extended for future color/age fields.

SECURITY DEFINER is limited to this operation because receipts must not be writable by clients. Empty search_path, fixed qualified tables, explicit source/library ownership checks and authenticated-only EXECUTE are required. Receipt SELECT is restricted by owner RLS; no client write grants. Receipts intentionally survive portfolio deletion. Files and library entries are retained.

Recovery validation: two PGlite test groups passed on reconstructed code (copy/replay/ownership/delete preservation and late-failure rollback); scoped lint and diff checks passed. This is a narrower checkpoint than the lost five-test suite. Full copy-field coverage, anon/account tests, true concurrent PostgreSQL/PostgREST acceptance, hosted advisors and installation acceptance remain pending. No claim of production readiness or UI integration.

Next work: finish backend regression coverage, persistent client request recovery, connect Dashboard to the dialogs, production mock/browser checks. Keep the feature unavailable in the real Dashboard until installation and acceptance. Storage cleanup and visibility hosted integration remain open.

## Follow-up 2026-10-25

Section Visibility is now installed; see SECTION_VISIBILITY_HOSTED_INSTALLATION.md for the installation/history mapping and remaining acceptance. Strengthened late-failure test to remove the injected failure, retry the same request key successfully, then replay and confirm exactly one copy and one receipt. Both PGlite test groups passed in this round. This does not establish concurrent real PostgreSQL acceptance or Dashboard integration. Portfolio actions remain prepared-only.

## Copy content and deletion regression

Added a populated six-section fixture and complete row comparisons excluding generated IDs/portfolio IDs. Checks template/color, visibility, shared references, independent copy edit, cascading copy deletion and preservation of original/library/Storage metadata. Three PGlite groups passed in one run; scoped ESLint and diff checks passed. This synthetic schema still uses text for some hosted date/numeric columns and does not establish real Storage API or concurrent PostgreSQL behavior. No hosted action migration or Dashboard change was made.
