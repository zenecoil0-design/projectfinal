# Library lifecycle / image limits — 2026-10-23 (Asia/Bangkok)

Repository `zenecoil0-design/projectfinal`, branch `codex/portfolio-next-phase`.
Starting local/remote HEAD **07e02d5b544d501812ef2a1454044e1f2731c95a**, clean checkout before task-owned changes. Never reset, force-push, modify main or apply hosted migrations under this task.

## A — Current target evidence, not inferred from old screenshots

Configured Supabase project inventory identifies Portfolio, `dlauefjrcstfcmhafyan`, ap-southeast-1, ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. **Read-only SQL now works**, unlike the historical readiness round. Reused the existing preflight SQL and extended its metadata allowlist to the library/relation/image/tag tables and Storage policies. Excludes indexes as relations; no application rows, file names, tokens or credentials were retrieved.

Target observations at this checkpoint:

- Portfolios id/user_id are non-null UUID, id PK, ownership SELECT/INSERT/UPDATE/DELETE policies; authenticated is non-bypass-RLS and can access owner rows; anon lacks table privileges. All 13 existing inspected public tables have RLS enabled. Expanded preflight reports 65 selected columns, 37 constraints, 42 policies and four Storage policies, plus effective grants/default privileges.
- `portfolio_section_visibility` is **absent** at this read. Migration history returned only `20261015162645 / cover_names`, statement digest `45968824011e7acc5845cec894c70359`. This is not equivalent to repository version numbers or proof every older migration was recorded. Stop/reconcile before any installation; do not rerun foundation/reset.
- Every education/activity/certificate source FK into portfolio relations is validated **ON DELETE CASCADE**. Source-to-image and source-to-tag-relation FKs also cascade. The tag relation points to shared `user_tags`; deleting a source does **not** delete shared tags. No visibility condition is part of these FKs.
- `replace_portfolio_selection(uuid,text,uuid[])` exists, SECURITY DEFINER with empty search_path, authenticated EXECUTE and no anon EXECUTE, definition digest `c1b4b23331549f671b20b0050388c364`. Digest/metadata alone does not prove its body equals the repo or that API permissions pass. Repository RPC checks source existence/ownership; FKs independently reject missing source IDs.
- Storage bucket `portfolio-images` is public. Four object policies restrict paths to `users/<auth.uid()>/...`, **not database reference-aware deletion**. No object/file rows were read or changed. Public download privacy and safe cross-reference cleanup remain separate issues.
- Security advisors returned four no-policy INFO findings (legacy activities/certificates/educations and users), the existing authenticated SECURITY DEFINER RPC warning and disabled leaked-password-protection warning. No unrelated policies/auth settings were changed. See [database linter](https://supabase.com/docs/guides/database/database-linter) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Performance advisor also returned existing findings; not a clean advisor PASS.
- Actual Data API exposure/cache and authenticated PostgreSQL/PostgREST acceptance are still unverified. `node --import tsx tests/integration/section-visibility-api.mjs --check` returned exit 2 / NOT_RUN: no local Docker engine + Compose. Native psql/PostgreSQL/PostgREST were absent. Temporary npx CLI help is not a database/API environment. No hosted fallback or service-role test.

## A — Deletion contract and source audit

All three Library handlers currently use generic window.confirm, delete the source filtered by id/user_id without returned-row verification, then attempt Storage deletion. They do not inspect portfolio impact, distinguish zero-row/unknown outcomes, serialize submissions or guard late callbacks. Image cleanup errors can be ignored. Existing save/upload/tag writes remain multi-request, not one database/Storage transaction.

Chosen database contract: **one owner-filtered source DELETE, verified with RETURNING**, using the existing validated cascade graph. No client loop over portfolios and no redundant deletion RPC/migration merely to reproduce these FKs. Includes hidden sections automatically. FK errors roll back the database statement. Removing only a portfolio selection does not delete its source. Stale selection containing a deleted source must fail (RPC validation/FK), never recreate it. An uncertain delete must be reconciled by reading the source before another destructive submission; no automatic resend and no rollback promise.

Storage is a distinct safety gate: path ownership is not proof a file is unreferenced. Do not delete files before confirmed database deletion, and do not assert a client read-then-remove check closes cross-tab/reference races. Until reference-safe cleanup is established, retain files and explicitly report pending cleanup rather than issue unsafe Storage removes. This limitation must not be labelled full cleanup acceptance.

## A checks executed

- `node --import tsx --test tests/library-delete-contract.test.ts tests/inspection/section-visibility-readiness.test.mjs`: **5/5 PASS**, synthetic PGlite only. Three new category cases cover two owner portfolios (including a hidden-reference fixture), removal from just one portfolio, source cascade, shared tags/other owner retained, unchanged Storage fixture and stale selection rejection. Existing read-only preflight tests remain intact. Fixtures create an isolated in-memory model; no hosted foundation/reset execution.
- Scoped ESLint on `tests/library-delete-contract.test.ts`: PASS. `git diff --check`: PASS.
- Removed exactly two trailing-space pairs from the prior UI regression report; check the committed range, not merely unstaged diff.
- Read installed Next 16.2.9 Playwright guide and Supabase/security/locking guidance. Fetched current changelog; no platform API/compression/dependency changes are introduced.

## Publication and next parts

A must be published and full-tree verified before B begins. Actual A/B/C SHAs will be supplied with the final handoff; the report-containing commits can be resolved with `git log --format='%H %s' -- docs/verification/LIBRARY_LIFECYCLE_REVIEW.md`. Subsequent sections will record implementation, verification and remaining installation/cleanup gates in this same report, not create parallel reports or relabel old evidence.
