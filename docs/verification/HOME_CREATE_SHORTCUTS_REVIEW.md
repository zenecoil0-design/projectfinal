# Home create shortcuts — scoped fix report (2026-10-22)

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Starting remote HEAD: `837f2425ac7e54157990a2a49b34887bebe5174f`

## Problem and evidence

In `src/components/home/HomeHeader.tsx` and `HeroSection.tsx`, the two create shortcuts linked straight to `/editor`. However, `src/app/editor/page.tsx` requires a `portfolio` query parameter and shows a missing-portfolio message when no ID is supplied. The existing `CreatePortfolioModal` already manages the name/template, authorized insert and navigation to `/editor?portfolio=<returned id>`.

## Applied changes

1. Wrapped the Home header's **สร้างผลงานใหม่** button and the Hero's **เริ่มสร้าง Portfolio** button with the existing creation modal. The other Home links are unchanged. No database, API, authentication implementation, creation logic, or PDF behavior was altered.
2. The sticky Home header's backdrop blur created a CSS containing block for the descendant fixed-position modal; switched the header to solid white to preserve viewport-sized overlay without changing the shared modal.
3. Added a Home Playwright regression case for both entry points, URL staying on the Home route until an actual portfolio is created, dialog dismissal, and a viewport-height assertion after opening from the header.

## Publication checkpoints

- `7bd04eb38e77df46d5c7a6acb974fb72bff70901` — both Home shortcuts and initial regression.
- `905d51b0d88cad2d3b0aa8c9e7217054c4b7f5e8` — CSS containment fix, viewport assertion, corrected Home URL match.
- Remote HEAD, exact file blobs, forward-only commits and affected file list were checked after publication. Comparison against starting HEAD: **2 commits ahead, 0 behind, 3 files changed**.
- `main` was not modified or merged.

## Verification scope and remaining checks

**Passed:** 10 static checks on the fetched remote source: HEAD/changed paths/forward history, two create-modal wrappers, no direct invalid `/editor` create link, no backdrop-blur ancestor, regression assertion existence, valid Home URL expectations, and unchanged Dashboard destinations.

**Not run here:** production build, full-repository TypeScript/ESLint, Playwright browser test, physical-device UI tests. The current runtime does not have a checkout/dependency installation or a running local Next.js + mock test environment; static checks must not be reported as browser PASS.

To complete execution verification on a checked-out branch with dependencies and the configured Chromium runner:

```bash
npm ci
npm run build
npx tsc --noEmit --incremental false
npx eslint src/components/home/HomeHeader.tsx src/components/home/HeroSection.tsx tests/e2e/home-recent.spec.ts
npx playwright test tests/e2e/home-recent.spec.ts --reporter=line
```

The Playwright configuration starts the mock Supabase endpoint and a **production** Next.js server; build first. Also visually inspect desktop/mobile overlay layering. Existing unrelated tests and hosted DB integration were not touched.

## Astra handoff

No high-risk work was undertaken. In particular, keep Section Visibility hosted migration/API and RLS verification, cross-portfolio library cleanup/Storage reference handling, async-save atomicity, and related multi-system changes in Astra's scope. This small Home shortcut fix has no database migrations or hosted data writes.
