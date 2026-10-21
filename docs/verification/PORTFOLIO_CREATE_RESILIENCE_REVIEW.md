# Portfolio create resilience review

## Baseline / callers

Started at fetched remote and clean worktree HEAD `415a3f2698c66d5120cc31e5ded99fda21c81c3d`, target branch `codex/portfolio-next-phase`. Reused isolated `dashboard-retry` worktree. Older dirty `portfolio-readiness` checkout is preserved unchanged; no reset/clean/force/main modification. Read AGENTS, relevant PRD/design/Next 16.2.9 router/client guidance, Supabase insert/auth-event docs and installed SDK missing-session handling. Changelog scan: upcoming TLS cipher deprecation does not change this request API.

Actual shared component: `src/components/portfolio/CreatePortfolioModal.tsx`. Its three import sites are Dashboard, HomeSidebar (desktop Home sidebar) and RecentPortfolios (Home create card, including mobile). `src/components/home/CreatePortfolioModal.tsx` is a different, unused component in this route path and is not edited. HomeHeader links directly to Editor rather than this modal; that separate link is not claimed as a modal caller.

## Cause / implementation

Original catch exposed arbitrary backend/auth message; `isCreating` alone did not synchronously lock handler entry. Name/template remained editable during a pending request, owner/lifetime guards were missing, and any truthy response ID could cause navigation.

- Capture trimmed title/template at submission. Retain original blank-name guidance and existing creation input maxLength=100; no new naming/uniqueness rule. Ref lock is acquired before first await; trigger/name/template/cancel/close handlers additionally consult it, not only React disabled props. Pending input/template/cancel/close controls are disabled and status announced. Escape/backdrop cannot close during pending work; normal close/reopen keeps same-account draft.
- Per-instance auth subscription tracks session owner and a lifetime/version token. Owner from local events is a binding hint, not authorization; `getUser()` still verifies it before insert. A not-yet-initialized binding fails safely without an insert. No async Supabase call inside auth callback. Same-owner refresh does not reset draft. Account change/signout invalidates pending results, closes modal and resets name/template/error even on Home, independently of Dashboard guards. A returned verified owner different from captured owner also discards the old account draft before any insert.
- Auth verification/network failure shows fixed Thai `createAuthError`, retains draft and does not redirect. A genuinely missing user/session (including the SDK's AuthSessionMissingError) retains original `/login?next=/` route. Do not equate transient auth failure with signout.
- Payload is still exactly `{ user_id, title, template_key }`. Select now returns `id, user_id, title, template_key`, so response can be checked against the captured request. ID must be non-empty trimmed string; owner/title/template must match. No UUID format requirement. Navigation uses encoded ID, only after acknowledgment. Extra selected fields verify this operation, not RLS.
- Insert failure/malformed/empty response uses fixed Thai `createResultError`: “ยืนยันการสร้างพอร์ตไม่สำเร็จ ชื่อและเทมเพลตที่เลือกยังอยู่ กรุณาตรวจรายการพอร์ตก่อนลองสร้างซ้ำ”. No raw message/logging, false rollback/no-create promise, automatic retry or success UI. Manual retry is allowed after failure; backend may already have inserted a row, so duplicate creation after an uncertain result is still possible.
- Unmount/account change invalidates current token; old auth result cannot insert, old insert result cannot navigate/show error or unlock a newer job. Cleanup unsubscribes and releases refs. Server requests already accepted may complete for the old owner; this does not cancel backend work. No server idempotency or conflict framework.
- Existing visual structure/theme is retained; unique input/label/error IDs, dialog name, close accessible name, pressed template state and pending status added locally. No global modal rewrite or dependency.

## Part A actual checks

- Production build: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack` PASS, nine static routes. Existing middleware deprecation/npm proxy warning.
- Standalone full-repo `node_modules/.bin/tsc --noEmit --incremental false` after build: PASS.
- Scoped ESLint on shared component/helper/new unit/browser tests: zero errors/warnings. `git diff --check`: PASS.
- `node --import tsx --test tests/portfolio-create.test.ts`: **2/2 PASS**. Checks unknown response shape, non-string/empty/padded ID, matching captured owner/title/template. No DB call.
- Production browser `portfolio-create.spec.ts`: **9/9 PASS in one run (32.7s)**. Exact captured/trimmed payload + select + returned-ID navigation, blank/no insert, normal draft reopen, same-turn duplicate submit/pending disabled controls, backend/network/empty/malformed insert failures with draft/manual retry, backend/network auth failure without insert/login/raw leakage. Zero skip/assertion reduction.

Part A is published and fetched before starting B. Actual A/B SHAs and final fetched HEAD/tree/worktree status are supplied in the handoff; report commit cannot embed its own SHA. Configured GitHub publication checks blob and complete-tree equality and uses expected-parent non-force update.

## Part B implementation / execution history

Part A was published as `846b1b29ba1efbd6bffb5a09ad4e70af09e93c37`, complete tree `7438d58713ce2cb3c33b5d8aa05772ffdb4ee4e7`, fetched and verified before B. The original tested local commit had identical tree content; configured GitHub publication uses an expected-parent, non-force update. A fresh fetch during B still matched A. Final B publication SHA is supplied in the handoff; resolve this report's final commit with `git log -1 --format=%H -- docs/verification/PORTFOLIO_CREATE_RESILIENCE_REVIEW.md`.

Added tests for all three real callers, missing-session login on both Home callers, stale auth and insert responses after account changes or client navigation, independent Home draft reset, returned owner mismatch without an auth event, fresh modal round/error clearing, and pending/error layout at 1440/390 px. Delayed auth must not insert; delayed insert must not navigate, expose an error in a new round, or unlock its job. Assertions inspect actual mocked HTTP requests and exact submitted payload, not just button state.

An additional code review found an early auth event could bind an unowned draft if it preceded INITIAL_SESSION. The small `createAccountChanged` helper now invalidates unknown-owner drafts on non-initial events, while preserving initial binding and same-owner refresh. A unit test exercises this initialization boundary without adding UI solely to produce the timing. No new query or payload change in B.

Execution chronology (do not combine these runs into one result):

1. On Part A production source, the 20 new B cases initially gave **19 PASS / 1 FAIL**. The test sent Escape to an unfocusable outer dialog div, so no real focused key event reached the handler. Changed only the test to press Escape from the existing name input; retained close/reopen/draft/error/retry assertions. Corrected case rerun: **1/1 PASS (22.8s)**.
2. On that same pre-hardening build, existing Dashboard 15 + rename 20 regression gave **35/35 PASS in one run (1.2min)**. Unit regression then gave **16/16 PASS**. These results precede the early-event helper change, and are not substituted for final-source checks.
3. After resuming, the old external node_modules symlink target was missing: build exited 127 (`next: not found`). Removed only the dangling symlink and restored installed dependencies with `npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=15000` from the unchanged lockfile (410 packages). No manifest/lockfile/dependency addition. Final hardened-source production build then **PASS**, all nine static routes, compilation 11.9s and built-in TypeScript 5.3s. Existing middleware deprecation, npm proxy and webpack cache warnings remain unrelated.
4. Final-source focused units: `node --import tsx --test tests/portfolio-create.test.ts tests/dashboard-portfolios.test.ts tests/editor-form-errors.test.ts tests/pdf-result.test.ts`: **17/17 PASS**, zero skipped (create 3, Dashboard 3, Editor error 9, PDF result 2). Scoped ESLint of the component/helper/unit/E2E files: **PASS**, zero errors/warnings.

5. Final-source standalone `node_modules/.bin/tsc --noEmit --incremental false` **PASS**, run after production build. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/dashboard-browser/runtime/chromium node_modules/.bin/playwright test tests/e2e/portfolio-create.spec.ts --reporter=line --max-failures=2`: **29/29 PASS in one run (53.1s)** on the final production build, zero skipped. This includes the original nine assertions/cases plus the twenty B cases.
6. On the same final build, `playwright test tests/e2e/dashboard-load.spec.ts tests/e2e/portfolio-rename.spec.ts --grep 'retry deduplicates|existing create, open and logout' --reporter=line --max-failures=2`: **2/2 PASS (5.8s)**. Rechecked the directly affected Dashboard draft-preserving retry and create/open/logout paths; did not relabel the earlier broad 35-case run as a final-source run. No source changed after this build/testing; only this report and plan evidence were finalized. Final `git diff --check` and report/plan local link checks: **PASS**.

## Visual checks

Browser screenshots use mock responses, not production accounts, captured before the early-account helper hardening (no visual source changed); final production tests repeated the viewport assertions. At 390×900 and 1440×900, the fixed Thai error wraps within the dialog, pending/error status can be scrolled into view, and footer controls remain accessible; original long-content modal scrolling retained. No physical-phone claim or global focus-trap/modal-system redesign.

- [Desktop pending](assets/portfolio-create-pending-desktop.png), [desktop error](assets/portfolio-create-error-desktop.png)
- [Mobile pending](assets/portfolio-create-pending-mobile.png), [mobile error](assets/portfolio-create-error-mobile.png)

## Boundaries / remaining work

Backend tests are localhost mocks, not hosted database/Storage/RLS acceptance. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified** per [readiness](SECTION_VISIBILITY_INTEGRATION_READINESS.md). No schema/RPC/RLS/migration/dependency/Editor/PDF change, real writes/deploy, Autosave/copy/delete or new real 14 MB fixture. Existing Home RecentPortfolios loading/auth behavior outside the create modal is not refactored.

The synchronous lock is per mounted modal instance, not server idempotency or a cross-tab/cross-caller global lock. A request accepted by the server can complete after navigation/account change; UI ignores its result but cannot undo it. Manual retry after network ambiguity can create another portfolio, including across reload/another tab. Draft is deliberately cleared on account change rather than handed to the next account. Browser auth mocks do not prove RLS/ownership in PostgreSQL; hosted/local PostgREST integration remains a separate acceptance step.
