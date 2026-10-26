# Unused Home cleanup — 2026-10-26

Base: f738d25d6ec986aef8cc19360bdd091bd5f00bb8. Work branch: codex/portfolio-next-phase.

## Change and evidence
Removed unused src/components/home/CreatePortfolioModal.tsx and homeData.ts (286 lines). Repository reference search found only the obsolete modal imported homeData. Dashboard, Header, Hero, Sidebar and Recent use components/portfolio/CreatePortfolioModal. No runtime flow or visual styling changed.

Updated one rename regression to open the final color/download accordion before clicking export. The old test searched for a button in a hidden panel. All preservation, filename and download assertions remain.

## Verification on final application source
- Production webpack build: PASS, actions feature flag left off.
- Full repository TypeScript: PASS.
- Browser run: 55 passed / 1 failed out of 56 (2.8 minutes). Failure was the obsolete export navigation above.
- After test-only adjustment: focused preservation/filename PDF case 1/1 PASS (4.1 seconds). No application source changed after build. This is not a single 56/56 run.
- Scoped ESLint on changed test: PASS; diff check: PASS.
- Coverage: create across Home/Dashboard, rename, late-session guards, palette persistence, actual PDF generation from hidden mobile Preview for all three templates. Those PDF tests verify page count against Preview and A4 page boxes. Backend is localhost mock; Chromium mobile viewport is emulation, not a phone.
- No new tests, dependencies, database changes, hosted writes or migrations.

## Remaining work
User postponed the isolated portfolio-actions PostgreSQL/PostgREST run. That acceptance is still NOT_RUN here; hosted actions installation and acceptance remain pending. Duplicate/delete remains gated off by default. This cleanup does not certify all project requirements complete. Storage cleanup, manual age override, long-content splitting and final hosted/device acceptance remain separate work.
