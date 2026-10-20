# Editor error messages — scoped review

## Starting point and scope

Starting/fetched local and remote HEAD: `57acaf8cc99825137d80d7a01215b28067669cce`, branch `codex/portfolio-next-phase`, clean working tree. Read AGENTS, relevant PRD/architecture/design, existing Editor/selection/Accordion/Tags/visibility reports and installed Next 16.2.9 server/client guide. Current repository is authoritative; old attachments are not copied over source.

Only six-form error presentation and necessary local issue typing are changed. No query, payload, RPC name, auth/Storage policy, validation rule, store baseline, save flow, PDF renderer or dependency change. No hosted connection/migration, reset, deploy, real account/Storage write or real deletion.

## Cause and error paths

All six forms previously called `getErrorMessage(error) || <Thai fallback>` in main-load and save catch blocks. `src/lib/errors.ts` returns arbitrary external message, so SQL/permission/constraint/Storage details could replace intended guidance. Cover upload and profile upload/read-before-save share their form's save catch; preface read-before-save likewise. Selection forms catch RPC failures. Main-load catches also cover activity/certificate image reads and selected-relation reads.

`src/lib/errors.ts` also serves ExportButton, TemplatePicker, dashboard and portfolio creation, so it is deliberately unchanged. PDF diagnostics must not be replaced by generic form copy.

## Chosen messages / guarantees

- `src/lib/editor/form-errors.ts`: small six-section message helper; load helper accepts no error, save helper never reads an external message.
- Load: “โหลดข้อมูล[หมวด]ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ หากยังมีปัญหาให้แจ้งผู้ดูแลระบบ”. No nonexistent main-load retry button, no refresh instruction that might discard another form's draft, no assertion that blank data is real.
- Save: “ยืนยันการบันทึก[หมวด]ไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ในฟอร์ม กรุณาลองบันทึกอีกครั้ง”. Selection forms say “รายการที่เลือกยังอยู่ในฟอร์ม”. The existing submit button is the retry action. Failed backend/auth/upload/read/RPC requests enter these messages without clearing draft; pending crops/files are cleared only along the original successful path.
- `EditorFormIssue` is locally constructed with a closed reason set. GPAX keeps “GPAX ไม่ถูกต้อง”. A backend object with that class name/reason is not trusted; even mutating a local instance's message cannot expose arbitrary text.
- Existing missing-RPC PGRST202 branch in save-selection now throws a typed local issue. Same RPC/payload/order/throw behavior; three form callers retain “ระบบบันทึกยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ” and local selection retention, but no longer promise “ข้อมูลเดิมยังอยู่ครบ” in the database.
- File validation is unchanged: JPG/PNG, 5 MB, and crop validation keep existing instructions. Authentication lookup failures use context-specific load/save guidance, not raw auth details.
- These messages promise only current form retention for the inspected failure paths. A network error does not establish server rollback/no commit. Profile/cover upload may already have completed before a later save/read fails; retry may upload again according to existing behavior. No new Storage cleanup or transactional guarantee is introduced.

## Part A verification

Mock backend only, not Supabase/Storage integration. Existing tests that asserted raw simulated text are updated to assert contextual Thai text **and** raw-message absence; their draft/order/dirty/navigation/guard assertions remain.

- Unit `node --import tsx --test tests/editor-form-errors.test.ts`: **9/9 PASS**. Covers six-section unknown/malformed/network-style messages, spoofed issue, getter that must not be read, trusted GPAX/admin advice, shared PDF reader unchanged, and actual saveSelection helper with stubbed fetch checking exact RPC payload/order and PGRST202 typing.
- Full repository `tsc --noEmit --incremental false`: PASS independently of build (also rerun after new tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack`: **PASS**, all nine static pages. Installed Next supports webpack; no package script change. Existing middleware deprecation, webpack cache-size and npm proxy-env warnings remain. No application source fix after this build.
- Scoped ESLint: **0 errors, 5 existing no-img-element warnings** across the five image-bearing forms; no image markup changed. Diff check PASS.
- First production browser run: **2 passed, 2 failed, 8 not run**, stopped at max-failures=2. New save-retry tests tried reopening before successful save finished folding the panel; default role queries could not find hidden status. Test-only fix waits for committed success in the existing status node before reopening. All visible-success/draft/dirty/guard assertions remain, no skip.
- Corrected production focused browser suite: **12/12 PASS (35.8s)**: main-load and save failure for every form, raw marker absent, section-correct Thai text, failure unlocks saving without marking saved, text/selection retained, leave warning and export block, retry success clears error/dirty and re-enables export.
- Default Playwright Chromium download returned truncated ZIP artifacts and failed. Used temporary @sparticuz/chromium 153.0.0 package assets, unpacked Chromium + SwiftShader/fonts to a fresh /tmp runtime and verified Chromium 153.0.8010.0; no app dependency/lockfile change. Browser tests use that executable with existing Playwright config. This is desktop Chromium emulation, not physical-phone validation.

Part A published/fetched/verified **`fa18789dc8f9d959f4035f568f34bdf9f6b50d6b`**, exact tree `700abc74f35f0fefc741c80456965949d474c482` (equivalent tested local 31064e9), local/remote equal and clean **before B began**. Configured GitHub connector, byte-preserving blobs checked against local blob SHAs, complete-tree comparison and expected-parent non-force ref update. No claim of new real database/Storage integration.

## Part B / final verification

B adds malformed/missing-message and actual fetch-rejection coverage for all six forms; cover/profile confirmed-crop upload failure/retry and unchanged file validation; preface/profile read-before-save; all three selection orders through failure/folding/mobile/retry; late load/save errors after portfolio/account change; long error copy at 1440/390; missing-RPC advice and save-time user lookup failure.

### Harness chronology, not hidden failures

1. First added-case production selection (26 cases): **16 PASS, 3 FAIL, 7 NOT RUN**. A certificate network-load assertion expired while UI still showed loading; installed PostgREST retries idempotent network requests three times with 1/2/4s backoff. Tests now assert all four actual GET attempts before expecting final failure. A profile test's initial-ready five-second wait expired with one section still loading; bounded wait became twenty seconds. A selection-order `has` locator was incorrectly rooted at the whole form inside a label; corrected to a relative named checkbox, retaining all order assertions. No application fix.
2. Focused run after those test corrections (17 cases): **15 PASS, 2 FAIL**. Activity/certificate initial readiness sometimes remained loading before error injection even with twenty-second wait. This was not a wrong-message/empty-state assertion and was **not conclusively attributed** to application code or SDK. No production auth/loader changes were made to hide it.
3. Temporary serverless-browser recommended-flag trial first could not start servers because temporary config changed default cwd: setup error, zero tests. Set webServer cwd explicitly to the repository. Following two-case trial: **1 PASS, 1 FAIL**; with `--single-process`, closing the first context closed the shared browser before the second page. This is a runtime/harness failure, not an application PASS.
4. New error-test suite now creates a fresh browser at each **test boundary**, preserving project launch/context/baseURL/viewport/headless settings and closing in finally. Reload, folding, mobile and portfolio/account changes **within each test still share the same browser/context**, so late-result and dirty checks are not replaced by fresh sessions. No locks/CORS/guards are disabled. Runtime override adds only vendor-recommended `--single-process` to existing flags; no app/project Playwright config change.
5. ESLint initially mistook Playwright's fixture callback named `use` for React's use hook; renamed that local parameter to `provideContext`. No rule disabled and no assertion removed. Test-only rename does not change runtime behavior or require a new application build.
6. Full new production error suite on final source: **39 PASS, 1 FAIL (8.8 minutes)**. Only `profile: network save/load errors keep safe copy and correct readiness` timed out at 90 seconds while waiting for save error. Host commands also stalled during this period, but the cause is **not proven** to be only the environment. An interrupted typecheck from that period is not counted as PASS. A previously pending focused result could not be recovered after the temporary browser directory disappeared; it is not counted.
7. Restored the same Chromium 153.0.8010.0 assets outside `/tmp`, with no repository dependency/config change. The first resumed command failed before tests because the old temporary config no longer existed. Recreated that external config and reran only the failed profile network case: **1/1 PASS (11.9 seconds)**, including save draft retention, all four network GET attempts, friendly load failure and export/readiness block. Thus all 40 distinct cases have passed across the full run plus the focused rerun; **not a claim of a clean 40/40 single run**. No source or assertion change between these two runs.

### Visual inspection

Opened actual [390px error UI](assets/editor-errors-mobile.png) and [1440px error UI](assets/editor-errors-desktop.png) from the successful layout case: Thai text wraps and is legible, no horizontal form overflow, save button reachable and not covered; dirty indicator and disabled PDF remain visible. These are mock data/Chromium screenshots, not real device or Supabase evidence. The raw marker was repeated 100 times in the backend response but the UI shows only fixed Thai text.

Final standalone full-repository `node_modules/.bin/tsc --noEmit --incremental false`: **PASS (exit 0)**. Final unit suite: **9/9 PASS**, zero skips. Final scoped ESLint across both helpers, six forms and six changed test files: **0 errors, 5 existing no-img-element warnings**. No application source changed after the successful build; B's `git diff --quiet <A> -- src supabase package.json package-lock.json` passes. Source therefore matches the production build used for B. No database tests or hosted calls are needed for this message-only change.

### Existing production regressions

- First focused existing Editor/Accordion/selection/Tags run: **15 PASS, 3 FAIL, 15 NOT RUN**, stopped at max-failures=3 (47.8 seconds). Six Accordion and nine Tags-failure variants passed. Three Tags/mobile tests still expected raw `SAVE FAIL TEST`; that expectation conflicts with this task. Updated only the expectation to contextual Thai save copy and added raw-marker absence. A repository search found the same obsolete `Cover save failed` expectation in the cover-name persistence test; updated it similarly before the remaining run. All dirty, leave-warning, order, payload, retry, export and content assertions remain.
- Corrected/remaining focused run: **18/18 PASS (35.5 seconds)**. Includes three Tags/mobile cases above, nine Editor cases (portfolio reset, atomic-save failure, crop, desktop/mobile overflow, late response, template-save failure, independent cover names/reload and cover/profile image source), and all six library-selection cases. Together with the first run's fifteen passes, all **33 distinct selected existing regressions** passed, not a claim of a clean 33/33 first run.
- Existing Tags tests continue to prove that Tags-only error permits otherwise-ready export and metadata retry preserves selection/dirty state; no Tags or visibility application source was changed.
- Existing size-confirmation regression `oversize mock waits, cancel/Escape do not download, confirm uses same Blob without rendering again`: **1/1 PASS (13.1 seconds)** on the same production build. It checks cancel, Escape, retry, initial cancel focus, export/template/visibility locks, exact near-threshold size copy, double-confirm download count and identical Blob without another build after confirmation. Only reported Blob size is mocked; this is **not evidence of a new real 14 MB PDF**. No PDF source changed, so no new large-file fixture or manual PDF inspection was performed this round.

### Commands used for final-source checks

All browser commands set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to the temporary extracted Chromium. The new error suite uses the external single-process config described above; existing regression suites use the unchanged repository config. Production webServer runs `npm start`, not development mode.

```sh
node --import tsx --test tests/editor-form-errors.test.ts
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint src/lib/editor/form-errors.ts src/lib/editor/save-selection.ts src/components/forms/{Cover,Preface,Profile,Education,Activity,Certificate}Form.tsx tests/editor-form-errors.test.ts tests/e2e/{editor-errors,editor,editor-accordion,editor-tags,library-selection}.spec.ts
git diff --check
git diff --quiet fa18789 -- src supabase package.json package-lock.json
# Full new error suite (39 pass / 1 timeout), followed by focused 1/1 pass:
node_modules/.bin/playwright test --config=<external-runtime-config> tests/e2e/editor-errors.spec.ts --reporter=line
node_modules/.bin/playwright test --config=<external-runtime-config> tests/e2e/editor-errors.spec.ts --grep 'profile: network save/load' --reporter=line --max-failures=1
# Initial existing selection (15 pass / 3 obsolete assertions / 15 not run):
node_modules/.bin/playwright test tests/e2e/editor.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/editor-tags.spec.ts --grep-invert 'all sections load without|PDF exports all pages|A4 scales uniformly|successful empty tags|a pending tag retry' --reporter=line --max-failures=3
# Corrected/remaining selection (18 pass):
node_modules/.bin/playwright test tests/e2e/editor-tags.spec.ts tests/e2e/editor.spec.ts tests/e2e/library-selection.spec.ts --grep-invert 'all sections load without|PDF exports all pages|A4 scales uniformly|successful empty tags|a pending tag retry|metadata retry preserves' --reporter=line --max-failures=2
node_modules/.bin/playwright test tests/e2e/pdf-size.spec.ts --grep 'oversize mock waits' --reporter=line --max-failures=1
```

The command-line selections avoid unrelated long-PDF and duplicate success-only metadata tests; no file gains `skip`, no assertion is removed, and no full browser/database-suite PASS is claimed. All three report links resolve. Final lint also includes the newly adjusted `editor-tags.spec.ts`.

## Boundaries and remaining work

- Shared error reader, ExportButton PDF errors, TemplatePicker, dashboard, portfolio creation and /my-data error paths are outside this six-form task. Existing form console diagnostics are not expanded; no new token/signed-URL/personal-data logging is added.
- Tags-only metadata errors and visibility failure/retry/export lock retain their own existing copy/lifecycle. Main-load failures still report failed readiness and block Preview/export; dirty drafts still block export. Folding is not save or visibility.
- Section Visibility real PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**, per [readiness report](SECTION_VISIBILITY_INTEGRATION_READINESS.md). This error-copy work must not mark visibility DONE or authorize installing its migration.
- No Autosave, schema, snapshot, new main-load retry, PDF/layout feature or dependency is started.

## Publication

Actual A/B published SHAs and final remote/tree verification are recorded in the final handoff after publishing; the report-containing commit cannot embed its own SHA without changing it. Resolve final with `git log -1 --format=%H -- docs/verification/EDITOR_ERROR_MESSAGES_REVIEW.md`. Use expected-parent non-force publication and exact-tree verification; stop on newer remote work rather than overwrite.
