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

Completed browser verification is 62 + 2 across **two separate passing runs**, not a single 64-test run and not the complete 79-test selection from Astra. No application source changed after the build. Publication evidence and scope decisions will be appended in this same report after Part A is remotely verified.
