# Home RecentPortfolios resilience

## Baseline and scope

Started from fetched local/remote `88764d6dd4bce35bea420b548fcf7713d2195b5d` on `codex/portfolio-next-phase`, using the clean detached `dashboard-retry` worktree. The older dirty `portfolio-readiness` checkout is preserved. No reset/force/main edits. Current repository source is the baseline, not old attachments.

Read AGENTS/PRD/ARCHITECTURE/DESIGN_SYSTEM, installed Next 16.2.9 client/router guidance and Supabase getUser/onAuthStateChange docs; scanned the changelog (upcoming TLS cipher retirement does not alter these APIs). Checked actual Home composition, both shared create-modal callers, Dashboard loader/parser, installed AuthSessionMissingError handling, mock server and test scripts. Only localhost synthetic fixtures are used.

## Cause / behavior

Previously `RecentPortfolios` loaded once, ignored getUser.error, converted query data with `data ?? []`, and only logged errors. There was no error/retry/empty distinction or lifetime/auth-subscription cleanup. A failed read looked like no cards and an old owner's result could remain after an account event.

The component now has explicit auth-loading, guest, auth-error, list-loading, list-error and confirmed-success states, plus a session-changed recovery state. Only successful parsed `[]` renders “ยังไม่มีพอร์ต”. Guest gets a sign-in explanation, no private list query and no forced navigation. Non-missing-session auth/network errors get fixed Thai text plus “ตรวจสอบบัญชีอีกครั้ง”; list errors get separate fixed Thai text plus “ลองใหม่”. Neither error path displays raw messages or logs private details.

The five-field contract exactly matches the existing `parseDashboardPortfolios` parser, reused without changing its other callers. The query retains `id,title,template_key,created_at,updated_at`, verified owner filter, updated_at descending, limit(3). Null/object/invalid rows throw into list-error; nullable text and unknown templates retain existing fallbacks without new naming restrictions. No read/query contract change beyond validation/coordinating retry.

## Session / request lifecycle

- Local auth events are session-binding hints, not authorization. `getUser()` verifies the owner before querying. An observed-owner mismatch does not query either account's data.
- A synchronous per-effect checking/reading lock blocks duplicate retries before React commit. List retry uses the verified owner and does not recheck auth or reload/remount the Home page.
- Auth changes/signout invalidate a generation, clear cards and verified owner immediately, and release only the old session's locks. No Supabase async work is called inside the auth callback. Guest signout stays public; a new owner sees session-changed and must explicitly verify again before reading. This is not auto-refresh/realtime.
- Each awaited result must still match the active effect/generation and verified owner. Old auth/list/error/finally callbacks cannot write or unlock a newer request. Same-owner token refresh retains cards and draft. Cleanup invalidates results, clears retry references and unsubscribes on unmount/Strict Mode cleanup.
- The RecentPortfolios create modal remains the first stable grid child in every state; no state-based key/remount. Its own account/lifetime guard remains unchanged and clears the previous owner's draft. HomeSidebar/Header/Hero and Dashboard/application save flows are not modified.

## Part A verification

- First source build passed, as did standalone full-repo TypeScript, scoped lint and six focused parser/create units. Initial production browser run stopped at max-failures=2: **1 PASS / 2 FAIL / 7 NOT RUN (13.7s)**. Real source issue: SDK recovery can emit SIGNED_IN before INITIAL_SESSION. Treating any first non-initial event as an account switch wrongly invalidated bootstrap. Fixed first-event binding, while keeping observed-owner/getUser mismatch and subsequent change guards.
- Rebuilt source: **PASS**, compilation 2.9s, built-in TypeScript 4.9s, nine static routes; standalone `node_modules/.bin/tsc --noEmit --incremental false` after build, scoped ESLint and diff check **PASS**. Existing middleware deprecation/npm proxy warnings only.
- Second production browser run: **9 PASS / 1 FAIL (14.4s)**. Network case waited only the default 5s while installed PostgREST retries transport failures sequentially (three retries, X-Retry-Count). Updated that test to allow 20s and assert **two logical requests / eight network attempts**, retaining exact request-count/no-auth-recheck/no-reload assertions. Did not disable SDK retry, alter application source or add app retry loops to satisfy the test.

- Third A production browser run on the unchanged rebuilt application: **10/10 PASS in one run (22.5s)**, zero skipped. Command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/dashboard-browser/runtime/chromium node_modules/.bin/playwright test tests/e2e/home-recent.spec.ts --reporter=line --max-failures=2`.
- Focused units: `node --import tsx --test tests/dashboard-portfolios.test.ts tests/portfolio-create.test.ts`: **6/6 PASS** (parser validation + create acknowledgment/account helper). No database tests or real data touched. Scoped lint covers `RecentPortfolios.tsx` and `home-recent.spec.ts`; standalone typecheck/diff repeated after test edits before publication.

Part B adds async/session/draft/viewport regression only after A is published and verified. Actual publication SHAs and final remote verification are recorded in the final handoff; this report cannot embed its own commit SHA.

## Part B / final-source evidence

Part A published as `ecb9035d82ccbc47f8a234337f747ee99a777974`, tree `7a24888dd7cf2d4abe5e50332e1073809a026413`; fetched remote, checked complete-tree equality, then aligned the equivalent local commit before beginning B. The expected-parent branch update was non-force. The original local tested commit `098112b` had the identical tree; differing publication SHA does not represent a source change. No application source changed after the successful second build above, so B uses that matching production build rather than rebuilding unchanged source.

- Added B production browser cases, focused run: **12/12 PASS in one run (11.7s)**. Covers delayed auth/list/retry after account change or navigation, signout after loaded cards and during retry, account-bound create draft clearing, same-owner refresh retaining cards/draft, background list retries through failure/success without modal remount, exact final create payload, same-turn auth retry lock, and 1440/390 keyboard/layout/open-Editor paths.
- Added two more focused cases: **2/2 PASS (4.5s)**. Confirmed cards clear immediately on owner switch, no new auth/list request occurs until explicit verification, and returned getUser owner mismatch without an event cannot issue a private query. Combined coverage is 24 Home cases, **not** a claim of one 24-case run: A 10 + B 12 + final two were separate runs.
- Unit regression on final application source: `node --import tsx --test tests/dashboard-portfolios.test.ts tests/portfolio-create.test.ts tests/editor-form-errors.test.ts tests/pdf-result.test.ts`: **17/17 PASS**, zero skips (3 parser, 3 create, 9 Editor errors, 2 PDF result/Blob-format). No database/Storage call.
- Existing production regression: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/dashboard-browser/runtime/chromium node_modules/.bin/playwright test tests/e2e/portfolio-create.spec.ts tests/e2e/dashboard-load.spec.ts tests/e2e/portfolio-rename.spec.ts --reporter=line --max-failures=2`: **64/64 PASS in one run (1.7min)** on the final matching production build (create 29, Dashboard 15, rename 20). Includes both Home create callers/guest-login paths, rename reload/Editor/filename, and create/open/logout. This is a fresh run for this task, not Astra's previous result.
- Closing `node_modules/.bin/tsc --noEmit --incremental false`, scoped `eslint src/components/home/RecentPortfolios.tsx tests/e2e/home-recent.spec.ts`, `git diff --check`, and local links in this report/implementation plan: **PASS**. Typecheck was after the final source build and includes the completed new tests. No source changes after that build; no assertions removed/weakened, skip added or legacy source/test expectation changed.

### Visual evidence

Opened and inspected actual browser captures at **1440×900** and **390×900**. Fixed Thai error wraps within its card; no horizontal page overflow, retry has visible keyboard focus and minimum 44px target, and Enter successfully retries before opening an existing portfolio. The original HomeHeader/Hero/Sidebar layout remains unchanged; screenshots are scrolled to the Recent section. These are Chromium viewport tests, not physical phones.

- [Desktop error/retry](assets/home-recent-error-desktop.png)
- [Mobile error/retry](assets/home-recent-error-mobile.png)

### Changed files / remaining limitations

Application change is confined to `src/components/home/RecentPortfolios.tsx`; existing shared parser and create modal source are unchanged. Added `tests/e2e/home-recent.spec.ts`, this report, two screenshots and M05.04 evidence in the plan (still PARTIAL). Error/guest/status text has accessible roles, retry buttons have visible focus/disabled pending state, card IDs are URL-encoded, and cards remain limited by the same server query limit(3).

No polling, new automatic auth recovery, realtime or cache framework. The installed SDK retains its own sequential GET network retries; “no extra auth on list retry” refers to component calls, and “duplicate retry lock” refers to overlapping UI operations, not suppression of SDK transport retries. Pending HTTP requests can finish after leaving; results are ignored by the component rather than claimed cancelled at the server. After an account change, recovery is explicit verification, not a new owner's data loaded from an untrusted event. An inconsistent stored session versus verified owner remains blocked; the user may need to reopen the page after correcting the account/session. UI isolation is not RLS acceptance or a general multi-tab conflict solution.

Final commit/remote SHA is supplied in the handoff and can be resolved with `git log -1 --format=%H -- docs/verification/HOME_RECENT_PORTFOLIOS_RESILIENCE_REVIEW.md`. The final detached worktree is checked against fetched target branch/tree; the older dirty checkout is not represented as clean.

## Boundaries

Mock auth events and owner-filter assertions do **not** prove RLS, hosted integration or physical-phone behavior. No hosted writes/schema/RPC/RLS/Storage/migration/dependency/Editor/PDF change or deployment. No new PDF 14 MB fixture. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**; see [integration readiness](SECTION_VISIBILITY_INTEGRATION_READINESS.md). No Autosave, snapshot, copy/delete, global auth provider, cache or realtime framework added.
