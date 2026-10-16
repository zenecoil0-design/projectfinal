# System fixes — template design deferred

Branch: `codex/portfolio-system-fixes`. Base: `a88f7043ccc9a7aa6b6e29c533a927164278a52f`.
The branch is intended for review/testing. Do not merge it into `main` until the live database checks below pass.

## Changes and reasons

- Add Suspense boundaries to Editor and Login so production prerendering succeeds.
- Keep all six forms mounted within a portfolio session. Every section loads on entry; switching steps retains draft text, selections and pending image files.
- Key editor sessions by portfolio ID, reset stores and ignore late loader/save results from disposed forms. Remove the cover's unscoped localStorage persistence.
- Block preview/export when any section fails to load; prevent saving a failed section over existing records.
- Show unsaved sections; warn on normal in-app link navigation and browser reload/close. This is not autosave; browser Back/Forward and browser crashes are not guaranteed to preserve drafts.
- Replace delete-then-insert selection writes with a single SQL transaction/RPC for education, activities and certificates. No unsafe fallback if the RPC is missing.
- Add image cropping to existing file inputs, including library uploads. Original images can be retained. Cropped output is JPEG, with transparency flattened onto white.
- Keep the current visual template; pack education/activity/certificate cards by measured height. A card too large for one page is rejected at export, not silently split or truncated.
- Historical baseline: A4 PDF had a 10-page/10,000,000-byte limit. The page-count ceiling was removed on 2026-10-16. The next round adds [oversized-file confirmation](verification/PDF_LARGE_FILE_CONFIRMATION_REVIEW.md): <=10,000,000 bytes downloads directly; larger files require consent using the same Blob. Output remains raster and text is not selectable.
- Bundle Noto Sans Thai fonts for consistent Thai rendering. Keep the existing desktop split view; mobile uses separate form/preview tabs.
- Fix ESLint errors and preserve `?portfolio=...` through login redirects; protect `/my-data` in middleware as well.

## Required database setup BEFORE using selection save

The frontend now calls `public.replace_portfolio_selection`. First review and apply:

`supabase/migrations/202610130001_atomic_portfolio_selection.sql`

Use a staging Supabase project with the current schema first. In the SQL editor, paste that file and run it as the database owner. It adds a function only and does not delete existing data when installed. It expects the library/relation tables already used by this repository:

- `portfolios(id uuid, user_id uuid)`
- `user_library_educations`, `user_library_activities`, `user_library_certificates`: `id uuid`, `user_id uuid`
- `portfolio_educations(portfolio_id, education_id, sort_order)`
- `portfolio_activities(portfolio_id, activity_id, sort_order)`
- `portfolio_certificates(portfolio_id, certificate_id, sort_order)`

The supplied schema screenshot predates these library tables. Confirm the current schema before applying. The function serializes writes per portfolio, verifies the authenticated owner and every selected library item, rejects duplicates/null IDs and rolls back the whole replacement if insertion fails. Execute is granted only to `authenticated`. It uses SECURITY DEFINER with an empty search path and explicit owner checks; table names are selected from a fixed allowlist.

This migration does not install or audit the existing RLS/storage policies. They still need independent verification. Existing library CRUD, image/tag multi-request saves and cross-tab conflict handling are not made transactional by this RPC.

If you return the frontend to `main`, the additive function can remain installed unused. No data rollback is necessary for this migration alone.

## Local setup

```sh
git fetch origin
git switch --track origin/codex/portfolio-system-fixes
npm ci
```

Set your own public Supabase URL and anonymous/publishable key in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
```

Never put a service-role key in browser environment variables. Then `npm run dev`.

## Automated verification

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm test` runs PostgreSQL-compatible PGlite transaction tests (including forced insert failure/rollback and unauthorized ownership) and pagination checks. This uses test-only schemas, not live Supabase.

Browser tests run a local mock Supabase API and a production server; no real user accounts or data are touched. Build with mock variables first, then run:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
npx playwright install chromium
npm run test:e2e
```

On PowerShell, set the two environment variables using `$env:NAME="value"` before running the build. Rebuild with your real public configuration afterward. Ports 3000 and 54321 must be free. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects a preinstalled Chromium.

## Live checks still required

1. Apply the migration to a staging copy; test saving/reopening selections for each section, including an empty selection and reordered selection.
2. Verify real login/logout, email confirmation and expiration; user A must not read or change user B's portfolio/library/storage via direct requests.
3. Test actual Storage uploads and public image access/CORS, deleted images, long text, many images, and PDF quality with a representative real portfolio.
4. Test Safari/iPhone and low-memory devices. Automated mobile coverage is a Chromium viewport simulation, not a physical device test.
5. Complete these checks before template/color design, which remains the final phase as requested.

## Verification in this work session

Production build completed with mock public configuration; TypeScript passed; ESLint has no errors (18 existing/new plain-image optimization warnings). Transaction and pagination tests passed. Browser checks cover full initial loading, draft retention, failed saves, per-portfolio reset, cropping, mobile form/preview switching, overflow rejection, page-count limits, and actual PDF download. The generated sample PDF is A4; Thai rendering was inspected after export. These are development checks and do not certify the production Supabase instance.
