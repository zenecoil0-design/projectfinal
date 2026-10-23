# Library lifecycle / image limits — 2026-10-23 (Asia/Bangkok)

Repository `zenecoil0-design/projectfinal`, branch `codex/portfolio-next-phase`.
Starting local/remote HEAD **07e02d5b544d501812ef2a1454044e1f2731c95a**, clean checkout before task-owned changes. Never reset, force-push, modify main or apply hosted migrations under this task.

## A — Current target evidence, not inferred from old screenshots

Read-only target metadata was available at the earlier checkpoint. Relevant source-to-portfolio, image and tag-junction foreign keys were confirmed to cascade on source deletion; shared tags are retained. This is catalog evidence, not authenticated API/RLS acceptance. Section Visibility was not present at that checkpoint. Migration history must be reconciled before installation; do not replay foundation/reset migrations.

Storage ownership checks alone do not prove reference-safe deletion. Safe cleanup, isolated PostgreSQL/PostgREST acceptance and hosted integration remain unverified. Existing security-review items remain open; this repository report intentionally omits target identifiers, raw catalog output and unrelated advisor details.

The isolated API runner returned exit 2 / NOT_RUN because a local Docker engine and Compose were unavailable. Native PostgreSQL/PostgREST were also unavailable. No hosted writes or service-role substitution occurred.

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

A published/fetched/full-tree verified at **51e283451f39114fc8da55c074de4971e68b7571**, tree `639fa177e27a1620c0ce392e75c6b3535401fdbd`, before B began. The only untracked item at that boundary was this task's CLI version-cache file (subsequently removed), not user work.

## B — Implementation and explicit release holds

- Added one shared `LibraryDeleteDialog` for all three libraries. Reads actual owner-filtered portfolio joins including hidden references, validates array/row/owner/id/title shape and never converts malformed/error reads to zero impact. Cancel/Escape preserves the underlying form. Rechecks impact before delete; changed snapshot requires confirmation again. This is not a full multi-tab conflict protocol: a reference can still change between the final read and DELETE; FK cascade ensures database completeness, not an immutable impact snapshot.
- One owner/id-filtered DELETE with returned-ID verification, synchronous duplicate lock and account/lifetime guards. Auth/impact failures have fixed Thai copy. Failed/zero-row/malformed delete responses enter an uncertain state with **read-back only** before any user-triggered retry, never automatic delete resends or rollback promises. Existing source updates now request one returned row, so a stale edit cannot silently treat a missing source as success. Existing selection RPC/FKs continue rejecting deleted IDs.
- `LibraryDraftGuard` adds a small independent operation-busy flag, composed with the existing draft flags. Loading/deleting/reconciling prevents category/history/link exits under the existing guard; does not mark content saved or clear dirty. Account changes still dispose the original scope. No global router/history interception was added.
- **Storage cleanup is BLOCKED, not completed.** Removed unchecked Storage remove calls from these three libraries, including pre-commit education-logo deletion and removed-image cleanup. Database rows can be deleted while files are deliberately retained. UI explicitly reports that files still need separately verified reference-safe cleanup. There is **no automatic cleanup retry/queue** in this patch: path-only policies and client check-then-remove are insufficient to guarantee no valid shared reference is destroyed. An approved reference-safe cleanup contract/operator workflow is required to close this requirement. No Storage files were deleted here.
- Certificate additions now cap at 2; activity at 4 through a shared helper. Certificate legacy >2 sets remain fully visible, cannot add, and text-only saves keep all images. Existing certificate image removal requires explicit confirmation then manual Save; cancel keeps images. No slicing legacy arrays. New image sort_order appends after the highest retained order, not the retained count (which could place new files before remaining old images).
- Prepared CLI-generated `supabase/migrations/20261023150558_library_image_limits.sql`: invoker trigger, empty search_path, whitelist of two image tables, parent-row locking, per-owner/RLS-aware count and 4/2 addition checks. Old rows are not rewritten or validated against a destructive count constraint. Existing same-parent image updates remain permitted. Multi-row over-limit insertion rolls back as one statement. No hosted application, no foundation/reset replay, no existing migration edited. Real concurrent-transaction behavior still requires isolated PostgreSQL acceptance.
- CLI generated the file locally before its optional PostHog telemetry was rejected by auto-review. Did not retry or route around that denied external transmission. No further CLI execution was needed; the resulting empty file was edited locally and the task-owned empty cache removed. No approval to send telemetry is assumed.

### B actual verification ledger

| Run | Result |
| --- | --- |
| New helper + cascade PGlite checks | 6/6 PASS; synthetic model, not API RLS proof |
| Combined helper/cascade/preflight/visibility | 13/13 PASS before final activity-only cap refinement; no skips |
| Build attempts | First interrupted before completion to fix retained-image append ordering; next completed successfully; after tightening activity-only over-limit validation, rebuilt successfully on final source. Existing middleware deprecation warning remains |
| Full-repo tsc after final build | PASS; final source, strictness unchanged |
| Scoped lint | Initial new-dialog effect errors corrected without suppression; final changed application/helper/test files have 0 errors, six existing no-img-element warnings in Library views |
| Browser attempt 1 (four selected) | 4 launch failures: former Chromium path was missing; no application acceptance result |
| Browser runtime setup | Playwright CDN returned invalid/truncated ZIP; standalone Chromium 153.0.8010.0 prepared outside repository. Tar extraction disabled archive ownership preservation because runtime chown returned EINVAL. No app dependency/lockfile change |
| Browser attempt 2 | **4/4 PASS (5.9s)** on final production build: three categories' impact/cancel/owner filters/returning/double-submit/no Storage deletion; legacy four-image certificate text save and cancelled image removal |

C will extend failure/session/draft/Preview-PDF regression using this same source/build unless a verified source defect requires a new build. This checkpoint is safe local implementation evidence, **not full Storage, PostgreSQL/PostgREST or hosted acceptance**.

## B publication recovery

Original local B `cb1cdab5b1bee86b8aba42c7be9c81b3351071ee` is retained under local reference `archive/library-lifecycle-original-b`. It is not a parent of the replacement publication commit. This replacement is based on remote A and carries the same application/tests/migration changes with a sanitized report. No force-push or history deletion is used. Earlier published A remains in remote history; sanitizing the current report does not erase that earlier publication.
