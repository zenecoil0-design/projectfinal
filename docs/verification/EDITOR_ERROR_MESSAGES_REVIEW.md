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

Part A remote SHA is recorded in B after publishing/fetch verification. No claim of new real database/Storage integration.

## Part B / final verification

Pending after Part A is published and remote verified. No claim of browser/PDF/production PASS before execution.

## Boundaries and remaining work

- Shared error reader, ExportButton PDF errors, TemplatePicker, dashboard, portfolio creation and /my-data error paths are outside this six-form task. Existing form console diagnostics are not expanded; no new token/signed-URL/personal-data logging is added.
- Tags-only metadata errors and visibility failure/retry/export lock retain their own existing copy/lifecycle. Main-load failures still report failed readiness and block Preview/export; dirty drafts still block export. Folding is not save or visibility.
- Section Visibility real PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**, per [readiness report](SECTION_VISIBILITY_INTEGRATION_READINESS.md). This error-copy work must not mark visibility DONE or authorize installing its migration.
- No Autosave, schema, snapshot, new main-load retry, PDF/layout feature or dependency is started.

## Publication

Actual A/B published SHAs and final remote/tree verification are recorded in the final handoff after publishing; the report-containing commit cannot embed its own SHA without changing it. Resolve final with `git log -1 --format=%H -- docs/verification/EDITOR_ERROR_MESSAGES_REVIEW.md`. Use expected-parent non-force publication and exact-tree verification; stop on newer remote work rather than overwrite.
