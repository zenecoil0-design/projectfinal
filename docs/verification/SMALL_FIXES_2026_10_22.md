# Small-scope portfolio fixes — 22 October 2026

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Start HEAD: `a8bc9321a90d441d3357d9e3107a7ce453be047e`  
Feature-fix HEAD before this report: `6a5750457805cc80b759888a837d03659c508d9a`

This handoff covers **three additional small, isolated rounds** after the earlier Home create-shortcuts fix, documented in [HOME_CREATE_SHORTCUTS_REVIEW.md](HOME_CREATE_SHORTCUTS_REVIEW.md). No migrations, production database actions, dependencies, auth changes, PDF pagination changes or changes to `main`.

## Part A — Mobile access to library

**Problem:** `HomeSidebar` is hidden below the `md` breakpoint. It contains Home's `/my-data` link; `HomeHeader` had no corresponding mobile shortcut.

**Change:** `HomeHeader.tsx` now renders a touch-sized, accessible, violet library icon link to `/my-data` on mobile only (`md:hidden`). The desktop sidebar remains the entry point for larger screens. `tests/e2e/home-recent.spec.ts` has separate mobile 390px and desktop 1440px navigation/visibility tests.

**Commit:** `8103c34d0ad45ab95f521938ba197c4c92672495`. Push to the target branch confirmed by remote HEAD and path/content checks.

## Part B — Project README

**Problem:** `README.md` was an untouched Next.js starter, citing `next/font`/a root-level `app/page.tsx` although the code uses Noto Sans Thai and `src/app`.

**Change:** Replaced README with a Thai project overview, setup commands, required public Supabase environment-variable names, real application routes, branch expectations, non-destructive testing commands and links to current PRD/architecture/verification documents. Explicitly distinguishes mock E2E from hosted integration and cautions against committing credentials or replaying historic reset/migration instructions.

**Commit:** `17ffa5c4910dd6b5f2ffd91cac0de3b777370b4f`. The remote file blob was checked after push.

## Part C — Shared safe date formatting

**Problem:** Both `DashboardPage` and `RecentPortfolios` independently formatted optional timestamps and relied on a `try/catch`. Some malformed input strings yield a Date with `NaN` time rather than throwing during construction, so the UI may show an invalid date marker instead of its intended dash.

**Change:** Added `formatPortfolioDate(value)` in `src/lib/dashboard-portfolios.ts`, using a finite valid-time check before formatting with the existing `th-TH` options. Both pages use the same helper. Two unit tests cover missing/invalid values and preservation of Thai-language formatting for a valid ISO timestamp. Existing portfolio parsing and Supabase queries are unchanged.

**Commit:** `6a5750457805cc80b759888a837d03659c508d9a`.

## Verification ledger

- GitHub branch HEAD, no rewind (three feature commits forward from start), and the **seven changed file paths** verified through the connected GitHub repository.
- Ten source-level verification conditions passed on remote files: mobile link and accessibility attributes, responsive E2E case locations and expected URL, README instructions, shared formatter and both page call sites, missing/invalid/valid date unit cases, and branch/diff consistency.
- **NOT RUN in this environment:** `npm ci`, production build, full-repo TypeScript, ESLint, unit tests, Playwright, physical/mobile-device acceptance or real Supabase integration. No remote CI status is claimed. Access to GitHub source via connector does not provide a local checked-out project with installed dependencies/test server.

### Required final execution checks in a checkout

```bash
git fetch origin
git switch codex/portfolio-next-phase
git pull --ff-only origin codex/portfolio-next-phase
npm ci
npm run build
npx tsc --noEmit --incremental false
npx eslint src/components/home/HomeHeader.tsx src/components/home/HeroSection.tsx src/components/home/RecentPortfolios.tsx src/app/dashboard/page.tsx src/lib/dashboard-portfolios.ts tests/dashboard-portfolios.test.ts tests/e2e/home-recent.spec.ts
npm test
npx playwright test tests/e2e/home-recent.spec.ts --reporter=line
```

The Playwright config requires a production build and launches local mock Supabase. Inspect the Home header and the library shortcut at mobile 390px and desktop 1440px; visually confirm that the modal still covers the viewport and mobile navigation reaches the login flow (if unauthenticated) or library (if authenticated). If tests fail, investigate rather than assuming previous static review is equivalent.

## Work intentionally reserved for Astra

- Supabase hosted migration/RLS/Storage and Section Visibility API integration or schema changes.
- Transactional or multi-request atomicity, stale async saves, and shared-library/portfolio deletion consistency.
- High-impact Editor/PDF/portfolio autosave architecture and full production acceptance.

Before any further work, compare current remote HEAD; do not reset, force-push, rewrite active changes or merge into `main` without authorization.
