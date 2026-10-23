# Profile calendar age — 2026-10-24 (Asia/Bangkok)

Repository: `zenecoil0-design/projectfinal`; branch: `codex/portfolio-next-phase`.
Starting local/remote HEAD: `e6cee17d8db7b12d97c2219e7a42791d62983ddd`; working tree clean. Used the existing `projectfinal-publish` worktree and preserved the older archived worktrees. No reset, force-push or main change.

## Change and rules

The form and shared ProfilePreview previously each parsed a date-only birthday with `new Date(string)`. UTC parsing could shift the calendar birthday in negative-offset timezones; invalid/future dates could produce NaN or negative ages. All three templates use that same Preview component.

Added pure `src/lib/age.ts::calculateAge(birthday, referenceDate)`. It parses strict YYYY-MM-DD components without constructing a birthday Date, validates actual Gregorian days (including century leap-year rules), and compares against the supplied Date's **local** year/month/day. No milliseconds/365 calculation. Empty, malformed, impossible and future birthdays or an invalid reference return null; same-day birth returns age zero.

The anniversary advances on the birthday. A Feb 29 birthday advances on Feb 29 in leap years and **March 1 in non-leap years**. Both callers pass the browser's current local Date; no timezone setting or timer subsystem was introduced.

ProfileForm shows null as “—”; ProfilePreview shows “—” without “ปี”, and shows a missing birthday as “—”. A valid Preview age includes the year unit. Cover/Classic/Modern/Minimal styles, A4, pagination and PDF renderer are unchanged.

Birthday state and save payload are unchanged. No new input validation, max/min date, manual age field, stored age or age-mode field was added. Browser date inputs may display an invalid legacy string as blank, but the helper does not mutate the stored birthday; a mocked legacy save confirms the original payload remains intact. This is not a claim that PostgreSQL accepts invalid dates.

## Actual verification

Read AGENTS/core requirements and the installed Next.js 16.2.9 client-component guide before implementation. No attached old source or schema image was used to overwrite current code.

| Phase | Command / result |
| --- | --- |
| A unit | `node --import tsx --test tests/age.test.ts`: **4/4 PASS** |
| A production build | `NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack`: PASS |
| A focused browser | `playwright test tests/e2e/profile-age.spec.ts --reporter=line`: **1/1 PASS (6.2s)** |
| A publish | **7f0f68a590700fec731357d01ae825ba589a98d9**, tree `ab76b93b8dbeb8cf98943e8cad0053cc172e20bf`; fetched and full-tree compared before B |
| B final unit | Same unit command: **4/4 PASS**, separate rerun |
| B final browser | **12/12 PASS in one run (35.4s)**: age 9 + existing Profile/Accordion regression 3 |
| Full repository types | `node_modules/.bin/tsc --noEmit --incremental false`: PASS after build and final test edits |
| Scoped lint | ESLint on age helper, ProfileForm, ProfilePreview and both new test files: 0 errors, two existing no-img-element warnings |
| Whitespace / docs | `git diff --check` and report/plan link checks; committed range checked before publishing |

Browser command:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/c9bc59bd45e7/browser-runtime/run/chromium node_modules/.bin/playwright test tests/e2e/profile-age.spec.ts tests/e2e/editor-accordion.spec.ts:85 tests/e2e/editor-accordion.spec.ts:135 tests/e2e/editor-accordion.spec.ts:209 --reporter=line
```

Tests use fixed reference dates/clock times, never an expected age that expires with the execution date. Unit subprocesses cover America/Los_Angeles, UTC and Asia/Bangkok. Browser tests demonstrate the same instant uses June 14 in Los Angeles versus June 15 in Bangkok. Coverage includes before/on/after birthday, year boundary, age zero, Feb 29/leap centuries, empty/invalid/future dates, all three templates, unchanged legacy payload, failed save/retry/reload, dirty/leave/export guards, portfolio switch, mobile panel and crop/draft regression.

Production application source did not change during B, so B reused A's matching build. No skipped/weakened assertions, new dependency or application source changes after build. The build retains the existing middleware deprecation warning. No browser failure was observed in these two runs.

Opened screenshots of the changed form area at desktop 1440px and mobile 390px: date input and age output fit their containers; mobile Preview/form switching retains the same age and dirty birthday. Screenshots are local Playwright artifacts under `profile-age-desktop-mobile-*/profile-age-{1440,390}.png`, not claimed as published images.

## Scope and handoff

M06.02 is PARTIAL for automatic calculation/display only; see the [scoped plan addendum](../PROFILE_AGE_PLAN_STATUS.md). Manual override input/mode/persistence and its remaining product decisions are still pending; this does not close the age feature or M06. No new midnight refresh behavior is promised: the calculation uses the local day when the existing UI renders.

All backend fixtures are mocks. No hosted database, schema, migration, RPC, Storage, cleanup, integration or PDF work was performed. Section Visibility API/hosted acceptance stays NOT_RUN/unverified; batch 2 blockers belong to the separate Astra follow-up. No PDF generation or system-wide browser/database suite was needed for this display-only change.

Attempted to change only M06.02 in the consolidated plan after verifying the destination repository is public and the diff was one row. Automatic review nevertheless rejected the full plan payload because it retains internal history/target details and lacks explicit approval for that full disclosure. Stopped the upload and retained the consolidated plan's prior contents; no rejected full plan is included in outgoing commits. Used the materially smaller scoped addendum above, containing only age status/evidence and manual-override TODO, through the same reviewed connector. No old pending plan/Storage edits or images are carried into this task. The consolidated plan's TODO row remains an explicit documentation-integration limitation, not a claim that the age implementation is missing or manual override is complete.

The final B SHA and local/remote comparison are recorded in the handoff after publication; the report revision is identifiable via `git log -1 --format='%H %s' -- docs/verification/PROFILE_AGE_REVIEW.md` rather than a self-referential commit hash.
