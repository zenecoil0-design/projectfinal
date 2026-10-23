# UI regression and submission scope — 2026-10-23

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Starting local/remote HEAD: `8fb2a4763588bbb6e954b74f59c10e3b7228f5af`; clean checkout.

## A — Tests following the current UI

- Dashboard navigation now explicitly selects the Home `banner` link in Home late-response, create-history and Library History smoke tests. The separate sidebar-link accessibility assertion remains sidebar-scoped. No `.first()` workaround.
- The create helper targets the `พอร์ตล่าสุด` region for the Recent caller, not the same-named Header button. Its button name also includes descriptive copy, so the region is exact but the button name retains the existing partial-name match. Dashboard and Sidebar callers remain independent.
- Auth inputs, create-name input and Editor template selector use retrying `toHaveCSS` assertions after resize. Mobile remains 16px and desktop 14px; field counts and 44px target checks are preserved. The other computed-font check in `editor.spec.ts` verifies a constant 16px A4 document, not a transitioning responsive control, and is unchanged.
- Home's draft-through-retry failure injection is limited to the Recent list's `limit=3` GET. It no longer intercepts the Editor's portfolio read after creation. Payload, selection, draft, session and navigation assertions remain intact.
- No application source/CSS, dependencies, schema or fixtures were changed. No added skips, fixed sleeps or broader test timeouts.

## Verification ledger (this round only)

Read installed Next.js 16.2.9 App Router Playwright and linking/navigation guides; inspected package scripts and localhost-only mock server before execution.

| Check | Actual result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed; existing lockfile unchanged |
| `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack` | Passed once; fresh checkout had no reusable production build. Existing middleware deprecation and webpack cache warnings only |
| Full-repo `node_modules/.bin/tsc --noEmit --incremental false` after build | Passed |
| Scoped ESLint on the five edited E2E files; `git diff --check` | Passed before final browser verification; final checks recorded below |
| Browser attempt 1: Home/Create/Auth, 62 selected | Interrupted at case 45 after diagnosing a Home route-teardown failure (`Fetch response has been disposed`) and an over-exact Recent button match introduced during the locator fix; **not a passing 62-test run** |
| Browser attempt 2: `playwright test tests/e2e/home-recent.spec.ts tests/e2e/portfolio-create.spec.ts tests/e2e/auth-accessibility.spec.ts --reporter=line` | **62/62 passed in one completed run (1.4m)** after the test-only fixes; Home 30 + Create 29 + Auth 3 |
| Separate focused run: `playwright test tests/e2e/library-history.spec.ts tests/e2e/minimal-template.spec.ts --grep 'after leaving the library\|Editor template selector is readable' --reporter=line` | **2/2 passed (5.4s)**: actual Back/Forward neighbor navigation smoke and the 390px → 1440px template-selector check |
| Final A full-repo typecheck, scoped ESLint and diff check after test fixes | Passed; no errors/warnings from the five edited test files |

The prior Astra result (62 passed / 17 failed out of 79) is historical input, not this round's result. Browser execution uses production Next.js, synthetic localhost backend data and Chromium 153.0.8010.0. It does not establish hosted integration, RLS or physical-phone acceptance. No database suite or large PDF fixture is needed for these test-only changes.

Completed browser verification is 62 + 2 across **two separate passing runs**, not a single 64-test run and not the complete 79-test selection from Astra. No application source changed after the build. All Playwright commands used `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/e7f35f55fa6c/review-browser/runtime/chromium`. Final A tsc/ESLint/diff checks passed after the test-only fixes. No unit/database tests were rerun because no unit/application/database code changed; prior Astra unit 9/9 is not counted as this round's evidence.

## A publication, before starting B

- Published A: **`1e7ea61f10259877951e80303f8967bb2b94f187`**, parent `8fb2a4763588bbb6e954b74f59c10e3b7228f5af`.
- Published full tree `39c6585d3c8dac9b682202d7130191b89cbbb1e5` matches the locally committed/tested tree. GitHub publication used a non-forced expected-parent ref update; subsequent fetch and full-tree diff confirmed equality. Local branch was aligned to that published commit without dropping changes, and working tree was clean before B.

## B — Owner-confirmed submission scope (2026-10-23, Asia/Bangkok)

| Topic | Previously active specification | Submission scope now / remaining work |
| --- | --- | --- |
| Content save | Autosave/debounce/queue required | **DEFERRED** for Autosave; use existing Save buttons, server-confirmed success/failure and dirty warning. No feature implementation in this batch |
| Images per portfolio | Select a subset of a library item's images | **DEFERRED** for image subsets; selected items use all images in library order. Item selection/order can differ per portfolio |
| Library updates | Snapshot B/version/accept-or-keep-old workflow | **DEFERRED**; shared library data is read again on reopening/reloading. No realtime or silently replacing active drafts. EditorSession dirty snapshots and pending PDF Blob identity are unrelated and remain intact |
| Delete library item | Impact/cross-portfolio deletion required | Still required: warn/confirm impact, remove references from all owner portfolios including hidden sections. Transaction/late-write/Storage behavior still needs design and verification in the next batch, not implemented here |
| Remove from portfolio / delete portfolio | Must not delete shared library | Still required: removing an item affects only that portfolio; deleting a portfolio preserves library data. Copy/delete are not declared complete |
| Image limits | Activity 4 / certificate 2 | Still required; current certificate client limit remains 4, so coordinated data-safe correction remains TODO. No legacy images removed |
| Copy, colors, age override, long-content split | Outstanding requirements/proposals | Not approved for removal. Keep copy, custom-vs-preset color decision, manual-age override questions and split requirements visible; no new expiry policy or reduced scope is invented |

Updated `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_PLAN.md` and active `docs/SYSTEM_TEST_PLAN.md`. Added only a historical-scope pointer to `docs/IMPLEMENTATION_AUDIT.md`; old reports/test results are not rewritten. Kept the original English Next.js agent-rules block intact.

Plan rows M03.03/.04, M04.01/.02 and M05.03 now say DEFERRED, not DONE; mixed-scope rows retain PARTIAL/TODO and no longer depend on those deferred features. The legacy test registry keeps 100 Case IDs, marks six SNP cases DEFERRED and revises SEL/SAVE/PORT/E2E expectations to the confirmed submission behavior, without claiming those acceptance cases were executed. Historical PDF PASS entries are retained as historical evidence. No completion percentage is calculated.

Next outcome batches: **real database + library → portfolio management → content/templates/PDF → acceptance**. The central plan gives dependencies and exit criteria for each; this is not authorization to start them automatically.

## B checks and handoff limits

- B is documentation-only; reused A's unchanged application build without repeating browser/build/database/PDF work.
- Read-only Node/assert checks **passed**: eight changed Markdown documents, 118 relative links resolve, all 100 test Case IDs retained in order, six SNP rows explicitly DEFERRED, five deferred plan rows, English Next.js rules unchanged, historical PDF-04/PDF-05/LAY-04 result rows byte-for-byte preserved, no application/dependency/migration changes and no edits to A's tests during B. The first draft of this checker incorrectly included 20 AC mapping IDs in the Case-ID count; corrected the checker scope and reran, not the expected test registry.
- `git diff --check` passed after removing three newly introduced Markdown trailing-space pairs. No build/browser rerun was needed for B's documentation edits. Scoped A lint command: `node_modules/.bin/eslint tests/e2e/home-recent.spec.ts tests/e2e/portfolio-create.spec.ts tests/e2e/library-history.spec.ts tests/e2e/auth-accessibility.spec.ts tests/e2e/minimal-template.spec.ts`.
- Evidence levels stay distinct: implementation exists; mock/PGlite checkpoint evidence; real PostgreSQL/PostgREST and hosted acceptance. **Section Visibility PostgreSQL/PostgREST API acceptance and hosted integration remain NOT_RUN/unverified.** Prepared runners/migrations and this batch's mock browser results do not close them.
- No changes to application source/CSS, query/payload, renderer, schema/RPC/RLS/Storage/migrations/dependencies or real data; no deployment, reset, deletion, force push or modification of main.
- Astra blockers/next decisions: target catalog/history/grants and isolated API/JWT acceptance; safe all-reference library deletion and Storage cleanup; certificate 2-image enforcement with old-data preservation; copy/delete; outstanding colors/age/split/content work and real-device/hosted acceptance. Do not restore the three DEFERRED features as submission blockers.
- B's actual published SHA and final remote/working-tree verification are supplied in the final handoff; the B commit is the one introducing this scope section (`git log -1 --format=%H -- docs/verification/UI_REGRESSION_AND_CORE_SCOPE_REVIEW.md`). A commit cannot embed its own final SHA without changing it.
