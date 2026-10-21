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
- Full-repo `tsc --noEmit --incremental false` after build, scoped ESLint on guard/hook/history tests/existing my-data test and `git diff --check`: results recorded at publication.

Part A publication is verified before B. Actual commit IDs/final remote SHA are provided in the handoff; this report's own SHA is resolvable with `git log -1 --format=%H -- docs/verification/LIBRARY_HISTORY_GUARD_REVIEW.md`.

## Part B / remaining verification

Three-category File/Tags/image/error/save/account/mobile regression and navigation smoke results will be appended after execution. Existing library save handlers have unguarded catch alerts after unmount; this is a separate lifecycle risk to reproduce during B, not assumed fixed by navigation cancellation.

Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**. This task does not close all library work, atomic DB/upload/cleanup, image limits, Autosave or snapshot integration.
