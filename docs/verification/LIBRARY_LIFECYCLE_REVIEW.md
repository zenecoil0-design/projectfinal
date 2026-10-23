# Library lifecycle / image limits — 2026-10-23 (Asia/Bangkok)

Repository `zenecoil0-design/projectfinal`, branch `codex/portfolio-next-phase`.
Starting local/remote HEAD **07e02d5b544d501812ef2a1454044e1f2731c95a**, clean checkout before task-owned changes. Never reset, force-push, modify main or apply hosted migrations under this task.

## A — Current target evidence, not inferred from old screenshots

Read-only target metadata was available at the earlier checkpoint. Relevant source-to-portfolio, image and tag-junction foreign keys were confirmed to cascade on source deletion; shared tags are retained. This is catalog evidence, not authenticated API/RLS acceptance. Section Visibility was not present at that checkpoint. Migration history must be reconciled before installation; do not replay foundation/reset migrations.

Storage ownership checks alone do not prove reference-safe deletion. Safe cleanup, isolated PostgreSQL/PostgREST acceptance and hosted integration remain unverified. Existing security-review items remain open; this repository report intentionally omits target identifiers, raw catalog output and unrelated advisor details.

The isolated API runner returned exit 2 / NOT_RUN because a local Docker engine and Compose were unavailable. Native PostgreSQL/PostgREST were also unavailable. No hosted writes or service-role substitution occurred.

## A — Deletion contract and source audit

Before B, all three Library handlers used generic window.confirm, deleted the source filtered by id/user_id without returned-row verification, then attempted Storage deletion. They did not inspect portfolio impact, distinguish zero-row/unknown outcomes, serialize submissions or guard late callbacks. Image cleanup errors could be ignored. Save/upload/tag writes remain multi-request, not one database/Storage transaction.

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

The B checkpoint above precedes C below. It is local implementation evidence, **not full Storage, PostgreSQL/PostgREST or hosted acceptance**.

## B publication recovery

Original local B `cb1cdab5b1bee86b8aba42c7be9c81b3351071ee` is retained under local reference `archive/library-lifecycle-original-b`. It is not a parent of the replacement publication commit. This replacement is based on remote A and carries the same application/tests/migration changes with a sanitized report. No force-push or history deletion is used. Earlier published A remains in remote history; sanitizing the current report does not erase that earlier publication.

Replacement B was published through the same reviewed GitHub connector at **e5ffc97e48b9ea4116b4a744c07f0485d5d01bb5**, tree **f32c094265d157c113d665b9d419229d4f7fe9a7**. Fetched and compared the complete local/remote trees before C. Only the report differs from original B; application, tests and migration are identical. The old B reference remains local and was not published as an ancestor. Resume started with local original B, remote A, and both working trees clean. Work continued in the separate `projectfinal-publish` worktree.

## C — Storage safety decision: BLOCKED, files retained

A focused read-only metadata check and repository audit confirm that file references extend beyond the three visible library lists: library logos/image rows, cover/profile URLs and legacy per-portfolio image fields must all be considered, including hidden sections. Only column metadata was read; no application rows, object names, signed URLs or credentials were retrieved. This report publishes the necessary conclusions, not the raw catalog response or target details.

The current model stores URLs rather than a shared asset identity with a coordinated deletion state. A client can observe no reference and another writer can save that URL before Storage remove completes. Ownership/path checks do not close this race. A server endpoint that merely repeats the same read-then-remove check would not close it either. Upload, database writes and Storage removal are separate operations.

**No reference-safe cleanup or cleanup retry is delivered.** The three Library flows retain Storage files on source deletion, image replacement/removal and upload/save failure. The UI distinguishes confirmed source deletion from retained files. There is no durable candidate list or safe cleanup retry after reload; do not claim that requirement passed, and do not infer a reliable list of unreferenced objects from component state or a filename prefix.

Options to close this blocker, requiring explicit design/acceptance before live use:

1. Keep retention and use a separately authorized maintenance procedure that pauses reference writers, reconciles all reference locations and ownership/canonical object keys, then cleans only proven candidates. This task did not run such maintenance and supplies no claim that an object is safe to delete.
2. Introduce a small persistent per-object cleanup/claim record plus database-enforced coordination for **every** reference writer. Atomically claim only unreferenced owner objects; reject new references to claimed objects until cleanup resolves; use an authenticated server cleanup path and persist bounded retry state. Storage permission behavior must match that protocol. Retry must revalidate rights/references and never repeat source deletion. Prove concurrent reference insertion, failed remove, process interruption and retry in isolated PostgreSQL/PostgREST + Storage before installing it. No service credential belongs in the browser.

Neither option is implemented or approved for hosted execution here. Do not add a client-only cleanup button and label it safe. Previously uploaded files whose save result is uncertain are deliberately retained even if this leaves unused files. Manual multi-request saves are not upgraded to a transaction/conflict framework in this patch.

## C — Final implementation and regression

- Fixed keyboard focus in the shared deletion dialog: Tab/Shift+Tab wrap among enabled controls; initial load/retry returns focus to an available control; Escape/cancel and focus restoration remain local to the dialog. The new application change in C is limited to this component.
- Expanded browser tests for all three kinds: impact error/malformed response and deduplicated retry; hidden portfolio impact; changed impact requiring another confirmation; committed/uncommitted network ambiguity with read-back before retry; same-turn duplicate delete; old account/unmounted results; deletion before a late manual update; pending delete/history/category busy behavior.
- Upload-success/image-response-failure injection confirms the referenced synthetic image is retained, no Storage remove occurs, and the confirmed image preview and dirty draft remain. It does not prove hosted Storage behavior or exactly-once uploads after an uncertain manual save.
- Existing /my-data fixtures now return DELETE representation, use the new explicit confirmation dialog and accept the deliberate legacy-certificate image-removal prompt. The cropped-File history fixture leaves one certificate image slot available, retaining all original draft/Tags/image order/crop/history assertions. Legacy four-image editing has separate coverage; no production array is sliced.
- Editor selection/Tags fixtures seed their additional source IDs into the existing mock so the stricter selection RPC contract can validate them. No assertion was removed. The mock returns the PostgREST singular-row error for a zero-row update, instead of allowing a false successful response. This is a mock contract, not API integration evidence.

### Commands and separate verification runs

All browser runs below use synthetic mock data, Chromium 153 and a production build. None is hosted integration or a physical-device test.

| Run | Actual result |
| --- | --- |
| Sanitized B unit/PGlite/preflight recheck | 13/13 PASS before publication |
| C first browser attempt | Found a Shift+Tab focus defect. Interrupted before completing the 27 selected cases; not a passing full run. A test also needed an explicit text-field locator |
| C second attempt after focus fix/rebuild | Interrupted at a file-input fixture that waited for an alert before accepting the existing crop dialog. Corrected the test to follow the actual crop-then-validation flow; no cap assertion weakened |
| Focused cap + real PDF check | 5/5 PASS, before final fixture refinements |
| Final production application build | PASS after the dialog source fix; no application source changed afterward |
| Full regression | **119/119 PASS in one run (3.3m)**: Accordion 6, Tags 21, History 8, lifecycle 27, selection 6, /my-data 51 |
| Final focused additions/PDF confirmation | **34/34 PASS in one run (45.4s)**: final lifecycle 33 plus existing Blob-identity/cancel/Escape/double-confirm regression 1 |
| Final helper/PGlite/cascade/preflight/visibility | **13/13 PASS**, no skips; cross-owner read/delete and stale update/selection rejection are synthetic database results |
| Full-repo TypeScript after build and final test edits | PASS, strictness unchanged |
| Scoped ESLint | PASS, 0 errors; six existing no-img-element warnings in the three Library views |
| Committed-range whitespace/link checks | Checked before publication; two trailing-whitespace fixes from A remain intact |
| Isolated API prerequisites recheck | Runner exit 2 / **NOT_RUN**: local Docker/Compose unavailable; native PostgreSQL/PostgREST unavailable. No repeated setup or hosted fallback |
| Hosted RLS / Storage integration | **NOT_RUN / unverified**; no hosted migration, account/data creation, reset, delete or deploy |

Commands actually used (run from the publication worktree):

```sh
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack
node_modules/.bin/tsc --noEmit --incremental false
node --import tsx --test tests/library-lifecycle.test.ts tests/library-delete-contract.test.ts tests/inspection/section-visibility-readiness.test.mjs tests/section-visibility.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime/run/chromium node_modules/.bin/playwright test tests/e2e/library-lifecycle.spec.ts tests/e2e/my-data.spec.ts tests/e2e/library-history.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts --reporter=line
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime/run/chromium node_modules/.bin/playwright test tests/e2e/library-lifecycle.spec.ts tests/e2e/pdf-size.spec.ts:59 --reporter=line
node --import tsx tests/integration/section-visibility-api.mjs --check
git diff --check
```

Scoped ESLint covered the three Libraries, LibraryDeleteDialog, LibraryDraftGuard, library-lifecycle helper, changed lifecycle/selection/Tags/my-data tests, mock backend and relevant unit tests. Build retains the existing middleware deprecation warning; PDF inspection retains a Pillow deprecation warning. No dependency was added to the application. No foundation/reset/database suite against a hosted target was run.

### Actual PDF and visual evidence

Final small fixtures use one surviving item per library kind (two ordered images for activity/certificate). The original item was referenced by A and B, with an optional section hidden in B. Deletion from the library is confirmed via the UI; reopening both portfolios sees no deleted selection. Deselecting only A was separately checked to retain the source and B. All three final PDFs were exported with the mobile Preview hidden at 390px using the unchanged real renderer.

| Template | Preview / PDF pages | PDF bytes | SHA-256 of final downloaded file |
| --- | --- | --- | --- |
| Classic | 7 / 7 | 476475 | cf5656c91a4da44c1ed5fbfba529fa252c18b0574593649c20a56341e8c939c3 |
| Modern | 7 / 7 | 504790 | a6719af0bb5b6a5bd539545e4fa3df9a4cb75e1d114ec05b5d83565d1d911b02 |
| Minimal | 7 / 7 | 418576 | 520a388daa14e4bb092aefa362749cd9ba61d9e1e39a73bcd86a24857e5f3cda |

Every MediaBox is 595.28 × 841.89 pt (A4); each file has seven distinct painted page rasters. Used the existing `tests/pdf-inspect.py`/pypdf to reopen files, then Poppler `pdftoppm -scale-to 1000 -png` to render all pages. Inspected cover, contents, profile, education, activity and certificate: deleted titles absent, surviving KEEP titles and images present, Thai text readable, footer/TOC numbers agree and do not overlap content. A missing optional GPA in the initial synthetic fixture was corrected to null; the final files/hashes above supersede the earlier fixture outputs. No renderer change or OCR was used.

| Physical paper | Section | Printed number / contents start |
| --- | --- | --- |
| 1–3 | Cover / preface / contents | none |
| 4 | Profile | 1 |
| 5 | Education | 2 |
| 6 | Activity | 3 |
| 7 | Certificate | 4 |

Visual evidence was opened and reviewed locally: desktop/390px dialogs and rendered PDF review sheets for Classic, Modern and Minimal. These are synthetic fixtures, not personal data. Long Thai titles, both dialog actions, Tab/Shift+Tab/Escape and focus return were checked; native history regressions use real Back/Forward. **Image publication is blocked by automatic review**, so no repository image links are claimed. The five inspected images remain tracked in the local proposal reference/worktree described below, under `docs/verification/assets/library-lifecycle-*.png`. Tests regenerate them under Playwright output paths; the PDF byte sizes/hashes above identify the actual inspected final files.

## Installation gates and handoff

1. **Do not install under this task.** Reconcile target migration history, actual selection-RPC body/ownership and existing trigger/function names before deciding any apply sequence. The old foundation/reset scripts must not be replayed.
2. Provide an isolated PostgreSQL/PostgREST environment and run JWT tests as two synthetic users, including concurrent 4/2 additions, cross-owner writes, source-delete/stale-save races and the existing Section Visibility API acceptance. PGlite/mock results do not replace this gate.
3. After separate approval, install any missing verified Section Visibility migration `20261020084510_section_visibility.sql` before an application release that depends on it, then the prepared `20261023150558_library_image_limits.sql`. If a conflicting structure/history entry exists, stop and design an additive fix; do not overwrite or drop it. Confirm Data API grants/schema-cache exposure and legacy-image preservation.
4. Hosted post-install tests require separately authorized test accounts/data and write permission. Verify ownership via user JWTs, both portfolio references (including hidden sections), cap/legacy edits and error/retry behavior. This authorization has not been supplied by the current read-only task.
5. Pause rollout or use a previously compatible application version on failure; preserve tables, saved overrides and files. No destructive rollback. If visibility schema is still absent, its existing load error/retry and export block must remain; never treat that failure as all-on.
6. Storage cleanup remains a release hold until one of the coordinated approaches above is accepted and verified. A saved operation committed before a later delete is not undone by client lifetime guards; later reload reads current library data, without realtime draft replacement.

The proposed plan edits concern M01.05, M02.02 and M04, but **are not published**: the plan file's upload remains blocked by automatic review. The redacted proposal is preserved locally under `archive/library-lifecycle-plan-pending` in the separate `projectfinal-plan-review` worktree. Current task conclusions in this report are implementation/local verification PARTIAL, cleanup BLOCKED and API/hosted NOT_RUN/unverified. The remote plan remains its prior version pending the owner's disclosure approval. Autosave, per-portfolio image subsets and snapshot/version remain DEFERRED. No main changes, force-push, hosted mutation or additional feature work.

C publication SHA and final remote/working-tree comparison are supplied in the handoff after publication; identify this report's published revision with `git log -1 --format='%H %s' -- docs/verification/LIBRARY_LIFECYCLE_REVIEW.md`. This avoids inventing a self-referential commit hash inside its own tree. A/B history and the preserved original B reference are documented above.

Publication review rejected the first C plan blob because the full historical plan retained operational/internal history and potentially target-specific context. Preserved that original local C as `archive/library-lifecycle-original-c`. A materially redacted proposal removed old target data counts and replaced detailed operational ledger/old baseline SHAs with links to existing evidence, keeping task states, historical test results and git history. Review rejected that proposal too, citing an unverified trusted-organizational destination and possible internal history/target metadata disclosure. The plan upload was stopped, not routed through another tool or file.

Review separately rejected a rendered PNG upload because it could not verify the image content from the request and considered the repository destination unverified. Stopped image uploads; all five synthetic images remain in the same local proposal reference for owner inspection. Both plan and images are excluded from replacement C. Original C and the proposal are not ancestors of published C; B is the parent. No findings were changed to PASS. Only unaffected code/tests and this scoped text report proceed through the same reviewed connector. Disclosure approval for the redacted plan and five inspected fixture images remains an explicit publication blocker, separate from Storage/API engineering blockers.
