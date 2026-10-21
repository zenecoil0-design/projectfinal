# Library Browser Back/Forward draft guard

## Baseline / scope

Started from fetched local/remote branch `codex/portfolio-next-phase` at `12ac8f6e778897d396020384594d7ca5e3412fc6`. Prior scratch checkouts had been pruned by workspace maintenance, so cloned a fresh `library-history` checkout; no reset/clean/force/main modification. Used current source, AGENTS, installed Next 16.2.9 router/Link guidance, guard/draft/save code and existing /my-data fixtures/tests. No real database/Storage writes, migrations or dependency changes.

## Reproduction and rejected approach

Built unchanged baseline with localhost mock credentials. Existing `my-data.spec.ts --grep 'native refresh warning'`: **1/1 PASS (13.2s)**, confirming native beforeunload preserves draft on cancelled refresh but old SPA Back leaves the form without confirmation, then Forward reloads the library. This was the old observation test, not evidence that the new guard worked.

Tried a page-scoped capture popstate listener plus Navigation API entry keys to restore the original entry without adding history. New tests: **2 FAIL / 3 NOT RUN**. A focused diagnostic rerun failed too. Temporary diagnostic instrumentation showed the guard cleaned up and the original form was gone before its listener ran, due to App Router's existing listener order. Rejected this approach entirely: restoring only the URL after unmount cannot recover a File/draft. Temporary logging/probe code was removed; no router/popstate patch or early global bootstrap is shipped.

## Selected implementation

`useLibraryHistoryGuard.ts` listens to the native Navigation API `navigate` event only while the account-scoped LibraryDraftGuard is mounted. For a **cancelable same-document traverse**, it checks current dirty/busy refs synchronously and calls `preventDefault()` on that native navigate event before Next receives popstate/commits the destination. This is not preventDefault on popstate.

- Existing `requestExit` owns the one pending action and existing accessible discard dialog. Continue/Escape leaves the original component, DOM, state, File references, image previews and dirty baseline mounted. Discard marks the guard clean and traverses to the captured destination **key** with a one-use allow token. It does not push a duplicate URL or hardcode Dashboard.
- Repeated traversals while confirming cannot replace the first pending destination or create another dialog. Busy saves cancel supported traversals without offering discard, matching the existing action guard.
- No pushState/replaceState/history.state writes, sentinel entries, URL offsets, localStorage or automatic content saves. Clean traversals use the browser's existing entries normally.
- Cleanup removes the navigate listener; resumed callbacks check the original mounted lifetime and destination still exists. A new account's guard cannot execute the previous guard's history action. The existing page account revalidation/unmount mechanism remains in charge.
- `beforeunload` remains the separate native guard for document exits/refresh. Browser controls its appearance/text. Native document exit/OS tab termination is not universally controllable.

### Browser boundary

Tested **Chromium 153.0.8010.0**, desktop/mobile viewports, via actual `page.goBack()`/`page.goForward()`. Required API: window.navigation with entries/currentEntry/traverseTo and cancelable same-document navigate events. The installed DOM types lack window.navigation, so a small local structural type is used; no any/strictness change.

Browsers without this API show an explicit warning while dirty to save/cancel before using Back/Forward; existing explicit actions and native beforeunload continue to work. The HTML standard allows some traversals to be **non-cancelable** (including browser safety/history-activation and cross-document/origin cases); the guard does not pretend to cancel these or implement a history trap. The tested paths pass; this is not a universal browser-navigation guarantee. Safari/Firefox/physical phones and their browser-UI-specific cancellation behavior still require acceptance before claiming broad support.

References: [Navigation API standard](https://html.spec.whatwg.org/multipage/nav-history-apis.html), [Navigation API design / cancellation restrictions](https://github.com/WICG/navigation-api). Next's installed App Router exposes no supported beforePopState blocker; no internal router API was modified.

## Part A actual checks

- Baseline build PASS (compile 10.9s / built-in TypeScript 4.9s). Capture prototype build PASS (3.6s/5.1s), but browser behavior failed as above; diagnostic build PASS (3.0s/5.0s) did not resolve it. These builds are not claimed as successful implementations.
- Selected native navigate guard production build PASS (compile 3.2s, built-in TypeScript 5.0s), all nine static routes. Existing middleware deprecation/npm proxy warnings remain.
- First selected-approach test attempt waited for a cancelled navigation to finish: first test hit the 90s Playwright timeout, second was interrupted (exit 130). Updated tests to bound cancelled page.goBack/Forward at 1s and accept only Playwright TimeoutError, while still asserting original DOM/value/URL, dialog, exact target and unchanged history length. A cancelled traversal has no destination load event. No assertions/skip were removed to pass.
- Final focused A run: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/review-browser/runtime/chromium node_modules/.bin/playwright test tests/e2e/library-history.spec.ts tests/e2e/my-data.spec.ts --grep 'dirty Back|dirty Forward|repeated Back|clean Back|native refresh' --reporter=line --max-failures=2`: **5/5 PASS (29.4s)** on the selected production build.
- Full-repo `tsc --noEmit --incremental false` after build, scoped ESLint on guard/hook/history tests/existing my-data test and `git diff --check`: **PASS**, zero lint errors/warnings for A's files.

Part A publication is verified before B. Actual commit IDs/final remote SHA are provided in the handoff; this report's own SHA is resolvable with `git log -1 --format=%H -- docs/verification/LIBRARY_HISTORY_GUARD_REVIEW.md`.

## Part B / remaining verification

Part A was published/fetched/verified as `ca0b97ff3b6f1836303fc6dddff01f3e63f1479e`, complete tree `4ddce8f07c5df19912580b8e2ed87b547673c466`, before beginning B. Its original local commit `02453e1` was content-identical; configured GitHub publication checks blob/tree hashes and uses an expected-parent non-force update. Local branch was then aligned with verified remote without reset.

### Save lifecycle issue reproduced and fixed

New focused education test before the B source fix: **1/1 FAIL**. A deferred save failed after two owner changes; the old handler displayed “ไม่สามารถบันทึกประวัติการศึกษาได้” over the next account's active draft. The pending history action itself had been discarded correctly. This was an actual pre-existing catch-alert issue, not a test timeout.

Added a per-mount save lifetime counter to EducationLibrary/ActivityLibrary/CertificateLibrary using their existing cleanup effect. Save captures this lifetime, checks after the primary write/before refresh and before resetting the form, and ignores catch/finally UI work for an obsolete mount. This also stops follow-up work at those checkpoints; it is not cancellation/rollback of an already accepted request or an atomic upload/DB transaction. No query fields, validation, image limits, save payload or delete/Storage cleanup algorithm changed. No source change to /my-data auth revalidation or Editor guards.

The first B source production build after lifetime changes passed (compile 3.3s / built-in TypeScript 4.9s). The focus-return fix build passed (3.2s/5.8s). After the keyboard-cycle fix below, the **final** production build passed (compile **3.9s**, built-in TypeScript **6.6s**, nine static routes). Standalone full-repo TypeScript after build: **PASS**. Scoped lint: **0 errors / 6 pre-existing img warnings**, all six in the three library components; new hook/guard/tests have no lint warnings. `git diff --check`: PASS.

### Regression execution history

- Initial final-source combined library/history run: **5 PASS / 2 FAIL / 49 NOT RUN (20.5s)**. The direct-entry test incorrectly assumed total history length=1 (Chromium retained initial about:blank), and unsupported-API test selected both its warning and Next route-announcer role=alert. Both are test setup/locator errors. Corrected to assert one same-document entry plus unchanged total length, and select the actual warning by text. No source fix/build change needed and no requirement assertions removed.
- Rechecked those two plus previously unrun cases using `--grep-invert 'dirty Back retains|dirty Forward retains|repeated Back/Forward|clean Back/Forward|direct document entry uses'`: **42 PASS / 2 FAIL / 7 NOT RUN (1.6min)**. Education/activity failed a new focus-return assertion: text, Tags, image sources and original form survived, but Escape did not return focus to the original input. Native dialog was being removed before passive-effect cleanup closed it.
- Fixed DiscardDialog to close/restore a still-connected previous focus target in **layout-effect cleanup**, before its DOM removal. Rebuilt final source as above. Focused `my-data.spec.ts --grep 'history keeps'`: **3/3 PASS (19.9s)**, including correct focus return, original DOM/File/Tags/image-order checks, and exact cropped-file bytes uploaded only after the explicit save.
- Closing TypeScript initially found **TS2352 in a new test**, because the installed DOM declaration lacks required window.navigation. Changed the test to an optional structural member plus explicit existence check, without any/unknown casts or strictness changes; full-repo typecheck then passed. This did not change application source or require another build.
- Added late **successful** primary-save responses for all three categories alongside late failures, checking no old refresh/Tag follow-up writes and no changes to the new account draft. Remaining-suite run with `--grep-invert 'history keeps'`: **54 PASS / 2 FAIL (2.1min)**. The two viewport tests exposed native Tab navigation leaving the dialog's buttons for browser chrome instead of wrapping directly. Added the same small Tab/Shift+Tab edge wrapping already used by RenamePortfolioDialog; no shared modal framework/refactor. This is confined to the discard dialog.
- Rebuilt final source (3.9s/6.6s above). Focused final viewport tests `my-data.spec.ts --grep 'history dialog'`: **2/2 PASS (16.5s)**. Includes Tab/Shift+Tab wrapping, Enter=continue, Escape, original draft, signout invalidation and subsequent navigation. Final remaining-suite command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/review-browser/runtime/chromium node_modules/.bin/playwright test tests/e2e/library-history.spec.ts tests/e2e/my-data.spec.ts --grep-invert 'history dialog' --reporter=line --max-failures=2`: **57/57 PASS (2.1min)**. The **2 + 57** final runs cover all **59** current cases on the same final application build, not a single 59-case run. The shared-dialog source fixes justified rechecking affected library/navigation regressions; no broad unrelated browser/database/PDF suite was run.
- Final closing full-repo TypeScript, scoped ESLint (0 errors / same six existing img warnings), diff and local documentation-link checks: **PASS**. No source/test changes after these final runs; only report wording/publication metadata finalized. All backend/image/save/failure injection uses synthetic localhost mock services, not hosted Supabase/Storage or real deletes. No assertions weakened/skipped to obtain these results.

### Coverage added in B

Each category verifies original DOM/title, selected Tags, existing image source/order, confirmed crop preview and a newly selected unuploaded File survive actual Back **and** Forward with Escape/continue. No refetch/save/Storage write occurs because of traversal. A later explicit save sends the exact cropped image bytes to mocked Storage, proving the parent still owns the File (not just a stale preview). Education supports one logo, so its old logo is checked before replacement and its new logo/File after replacement; no field/image rule changed.

Each category also exercises failed save staying dirty, retry-save pending while both history directions remain blocked without discard dialog, successful save returning to clean navigation, account-change pending-action cleanup and late successful/failed saves not alerting/altering the new account's draft or issuing old post-save refresh/Tag writes. Existing load/Tags retry/modal/category/Link/refresh tests remain intact. New viewport cases check keyboard focus cycling/Escape and signout cleanup at 1440/390px. Direct entry with about:blank or a prior document uses native beforeunload, not the custom SPA dialog. A simulated missing Navigation API checks the explicit warning and existing native/close guards. Home→Dashboard→Editor history smoke verifies guard cleanup outside the library.

### Visual evidence

Captured and opened actual final-build browser screenshots at 1440×900 and 390×900. Dialog text wraps, both actions remain in view, focus is visible, and the original form/draft is behind the modal. These are emulated viewport checks, not physical-device acceptance.

- [Desktop dialog](assets/library-history-desktop.png)
- [Mobile dialog](assets/library-history-mobile.png)

### Status / outstanding acceptance

This implements/test-drives the supported cancelable same-document path; **browsers without the API and non-cancelable traversals remain outside the blocking guarantee**. M02.05 stays PARTIAL and broad browser/physical-device acceptance remains outstanding. The old resilience report is preserved as history with a pointer to this scope; library work as a whole is not marked DONE.

Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**. This task does not close all library work, atomic DB/upload/cleanup, image limits, Autosave or snapshot integration.

## Delivery files and verification

Application files: LibraryDraftGuard.tsx (existing confirmation/focus), useLibraryHistoryGuard.ts (new scoped native listener), and the three library components (save lifetime only). `src/app/my-data/page.tsx` was inspected but unchanged; its existing account-key/unmount/auth flow is reused. Tests: library-history.spec.ts and the existing my-data.spec.ts (historical Back/Forward observation upgraded to real guard assertions, existing data checks retained). Docs: this report, the earlier resilience report and M02.05; two inspected desktop/mobile PNG captures.

Final B SHA is supplied in the handoff and resolved from the report's last commit as above. Publication requires complete-tree equality with the tested local commit, expected-parent non-force branch update, then fetched local/remote HEAD/tree equality and clean worktree. No main change or destructive cleanup. The initial scratch pruning predated this task; the fresh checkout was not used to overwrite any surviving user edits.
