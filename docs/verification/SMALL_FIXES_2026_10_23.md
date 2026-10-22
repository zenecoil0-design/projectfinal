# Small fixes and audit — 23 October 2026 (Asia/Bangkok)

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Initial checked remote HEAD: `60e9388367978aae78ef57b924048c4654cb3083`  
Source-fix HEAD before writing this report: `d567efeaea99d3049bd94039838d036d81e314a9`

This report covers four isolated changes while reserving cross-cutting work for Astra. Changes were committed and published separately to the existing branch. Do not merge to `main` automatically; do not reset, force-push or replay destructive maintenance.

## Part 1 — Auth form accessibility

**Evidence:** `src/app/login/page.tsx` and `src/app/register/page.tsx` used visible label elements without `htmlFor`/input `id` associations; Register's reveal-password icon button did not have an accessible name.

**Fix:** Associated the two Login and four Register input/label pairs; exposed error/status messages by semantic roles; gave both password toggle buttons accessible show/hide labels, pressed state and keyboard-visible focus styles/touch-sized controls. Did not alter login/registration logic or database queries. Added `tests/e2e/auth-accessibility.spec.ts` with two focused cases.

Commit: `e3a3e9fc0e363cfa79bd5b92c2e627b33c84d853`.

## Part 2 — Mobile Auth input font size

**Evidence:** All six Auth text/password inputs used `text-sm` on mobile. The design system targets readable 16px mobile form controls.

**Fix:** These inputs now use `text-base sm:text-sm`, preserving the desktop baseline. Added a 390px/1440px computed-font regression in `tests/e2e/auth-accessibility.spec.ts`.

Commit: `674eac87815b14f86a7c45706ef55d3e4b84382f`.

## Part 3 — Shared image crop dialog accessibility

**Evidence:** `src/components/images/CropInput.tsx` used a native `<dialog>` with visible heading/filename but no accessible heading/description association; action buttons lacked the project's 44px target baseline.

**Fix:** Added React `useId()` heading/description IDs referenced from the dialog; increased cancel/original/crop action touch targets and visible focus styles. File queue, crop math, MIME limits, image encoding and upload handlers were not changed. Added an accessible named-dialog assertion in the existing `tests/e2e/my-data.spec.ts` image picker test.

Commit: `00cacd3a17c88f5844bb8febb5a948d192f55cd3`.

## Part 4 — Template display name consistency

**Evidence:** The template picker/create modal call the `modern` template `Emerald Editorial`, but Home/Dashboard card helpers rendered its name as `Modern`.

**Fix:** Added shared `portfolioTemplateName` in `src/lib/dashboard-portfolios.ts`. Both cards now present the same name as template selection, use the existing Classic/Minimal titles, and display `รูปแบบเดิม` for unknown historical keys rather than falsely labelling them Classic. This only changes display strings; no stored `template_key` values or preview implementation were changed. Added a unit test to `tests/dashboard-portfolios.test.ts`.

Commit: `d567efeaea99d3049bd94039838d036d81e314a9`.

## Audit scope and outstanding issues

Inspected latest source for Home/Dashboard/Auth, library editing/navigation/images, editor forms and previews, shared layout/template/PDF controls, documentation and selected tests. This was not a complete line-by-line audit of every repository file, nor a runtime/hosted-data acceptance run.

**For Astra / cross-cutting scope:**

- **M02 certificate image cap mismatch:** current `CertificateLibrary.tsx` still uses four images and displays 4 in the counter, while `PRD.md` and `AGENTS.md` require two. Existing history/mock browser coverage can add a third certificate image; changing the UI alone could invalidate tests and leave server-side constraints unchanged. Implement the coordinated client/server/old-data-safe rule, keep existing legacy images intact until deliberately resolved, and update affected tests.
- **M11 forgot password:** no implemented recovery route in the inspected Login screen; requires validated Supabase Auth/redirect/reset behavior and tests.
- Section Visibility target migration/RLS/API integration remains unverified; also outstanding: per-portfolio image choices/snapshots, safe multi-portfolio library deletion and Storage cleanup, autosave/revision/conflicts, complete age mode and PDF/page model integration. Do not treat these as isolated cosmetic fixes.
- Responsive page acceptance on real devices, overall UX audit and complete regression matrix remain outstanding.

## Verification ledger

- **PASSED (remote static review only):** checked remote branch against expected parents, successive non-forced forward-only publications, changed path list, all Auth label/input IDs, status roles and toggle attributes, responsive text classes, native crop dialog name and buttons, shared template helper and call sites, and presence of relevant regression source.
- **NOT RUN:** `npm ci`, TypeScript typecheck, production build, scoped/full lint, Node unit tests, Playwright/browser/mobile tests and hosted Supabase integration. Local runtime does not have the latest repository checkout/dependencies; attempted direct clone connection failed DNS resolution. No workflow runs / passing CI status should be inferred from GitHub source checks.

Suggested final execution/acceptance checks in a real checkout (do not overwrite uncommitted local changes):

```bash
git fetch origin
git switch codex/portfolio-next-phase
git pull --ff-only origin codex/portfolio-next-phase
npm ci
npm run build
npx tsc --noEmit --incremental false
npm run lint
npm test
npx playwright test tests/e2e/auth-accessibility.spec.ts tests/e2e/my-data.spec.ts tests/e2e/home-recent.spec.ts --reporter=line
```

The Playwright setup starts a local mocked Supabase backend with production Next.js. It does **not** validate hosted RLS/Storage/API. Confirm responsive UI on 390px and desktop 1440px, plus physical-device focus and image crop, before calling the work accepted.

Previous rounds: [Home create shortcuts](HOME_CREATE_SHORTCUTS_REVIEW.md), [mobile library/README/date improvements](SMALL_FIXES_2026_10_22.md).
