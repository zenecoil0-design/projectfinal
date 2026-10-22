# Scoped UI and Playwright portability follow-up — 23 Oct 2026

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Starting remote HEAD: `da2c2e3b5086160d08cd021fc9697d8fb8ec5caa`  
Source changes HEAD: `3adb57013c00b0ee66afa044cb2e711f80870676`

## Goal and limits

Reduce remaining low-risk, local UI, accessibility and test portability defects without disturbing main, migration state, database rows, auth flows, PDF export logic or in-flight feature work. Each change was based on the current GitHub branch and published with a non-forced expected-HEAD update. This report is an audit/checkpoint, **not** a claim of full end-to-end acceptance or a proof every repository component has no remaining issues.

## Six published changes

| Round | Commit | Evidence and scoped change | Regression coverage |
| --- | --- | --- | --- |
| Home feature copy | `2d51ce27d910e5b445e39b36527a7b8d44ed7852` | Hero misleadingly claimed PDF download only future-ready despite ExportButton being implemented. Reworded to describe preview and PDF download; Home sidebar Dashboard icon accessible label changed from generic English `Dashboard` to `ไปหน้า Dashboard` | `tests/e2e/home-recent.spec.ts` copy/link assertion |
| Create modal touch targets | `4676f1e61a28cb36eaa102571145af94b652b6ef` | Portfolio name input used 14px on narrow screens; close icon button 40px. Set mobile text 16px, desktop 14px; close target 44px plus focus ring | `tests/e2e/portfolio-create.spec.ts` 390/1440px checks |
| Editor template selector | `2233d5cf6428981a74b05a5d00f843fb4692ec8c` | Selector inherited tiny toolbar font and insufficient target; added min-height 44px, mobile 16px, desktop 14px and focus ring | `tests/e2e/minimal-template.spec.ts` responsive check |
| Editor mobile navigation | `ec07071d30a6150dcf63065e6531a5b26103f9aa` | Form/preview toggles and Dashboard return link were smaller than 44px; increased targets and keyboard focus indicators without changing panel logic | `tests/e2e/editor.spec.ts` 390px controls and pressed state |
| Home keyboard focus | `8c495647996e5111df8400f9a2f67e4a711598e4` | Standardized focus-visible outlines on Home logo, create controls, profile links, sidebar links and Hero navigation | `tests/e2e/home-recent.spec.ts` keyboard focus assertion |
| Portable editor E2E artifacts | `3adb57013c00b0ee66afa044cb2e711f80870676` | Nine screenshot/PDF output locations in `tests/e2e/editor.spec.ts` used absolute `/tmp/...`, problematic on Windows. Switched to Playwright `testInfo.outputPath(...)` with testInfo fixtures in five relevant cases. Assertion and app behavior unchanged | Existing test cases now write in per-test output dirs |

## Review of neighboring source

The scoped inspection included Home/Dashboard route navigation, creation modal, Editor toolbar and form/preview switches, Auth and crop dialog controls (from previous rounds), three Library views, form/preview components, UI helper files and several related Playwright tests. No further *confirmed, locally isolatable* bug was selected from those samples at this checkpoint. It would be inaccurate to declare a complete repository audit, because all execution paths, actual responsive screens and the live backend are not verified.

Earlier completed rounds:
- [23 Oct accessibility/template work](SMALL_FIXES_2026_10_23.md)
- [Home/library/README/shared date changes](SMALL_FIXES_2026_10_22.md)
- [Home create shortcuts](HOME_CREATE_SHORTCUTS_REVIEW.md)

## Validation and remaining acceptance

**Static source and GitHub publication verified:** six sequential commits ahead of the checkpoint; no backwards commits; changed source and test files read back from the remote; Home copy, accessible labels, responsive classes, 44px minimum target classes and Playwright portable output paths present. No changes to `main`.

**NOT RUN:** installation, TypeScript full typecheck, lint, unit tests, build, Playwright browser tests, visual regression/device acceptance and hosted Supabase/RLS/Storage integration. GitHub connector allows reading/editing the branch, but the local runtime has no checked-out live project/dependencies, and a direct git connection failed DNS lookup. Source tests being added are not evidence of passing runtime tests.

Run on a safe checkout with current branch and no conflicting local changes:

```bash
git fetch origin
git switch codex/portfolio-next-phase
git pull --ff-only origin codex/portfolio-next-phase
npm ci
npm run build
npx tsc --noEmit --incremental false
npm run lint
npm test
npx playwright test tests/e2e/home-recent.spec.ts tests/e2e/portfolio-create.spec.ts tests/e2e/minimal-template.spec.ts tests/e2e/editor.spec.ts tests/e2e/auth-accessibility.spec.ts tests/e2e/my-data.spec.ts --reporter=line
```

E2E uses mock Supabase and production Next server per Playwright config, not production database. Pay particular attention to keyboard focus, 390px input fonts, 44px controls, overlay visibility, A4 Preview/PDF regression, and generated test artifacts on Windows.

## For Astra

Do not combine this small scope with unverified high-impact features. Keep staged/hosted Section Visibility migration and JWT/RLS checks, certificate max-2-images enforcement at API/data layer with legacy-data preservation (current client still allows 4), forgotten-password auth/recovery flow, snapshot per portfolio and selected-asset IDs, safe delete/Storage references, multi-request writes/revision/Autosave conflicts, age modes, pagination/large-content overflow, and full browser/device acceptance in Astra's planning/review queue.

**Exit criterion for this follow-up:** all six local code/test patches are published and remote source checks completed; full acceptance is not met until executable test results are available.
