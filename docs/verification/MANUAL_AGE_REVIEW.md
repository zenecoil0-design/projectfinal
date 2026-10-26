# Manual profile age — 27 October 2026

Status: implementation and local validation complete; hosted migration and acceptance pending. The feature is OFF by default (`NEXT_PUBLIC_MANUAL_AGE_ENABLED` must equal `true`). Current deployments keep the original profile query/payload until enabled.

## Contract
- Auto mode remains the default. Manual mode uses the entered integer without changing the birthday; changing birthday does not overwrite manual age.
- Switching to auto preserves a valid manual value for later reuse. Zero is valid. Empty manual mode, negative values, fractions, exponent notation and integer overflow are rejected before upload/write. The upper bound is PostgreSQL integer storage capacity, not an age recommendation.
- Mode/value join the existing profile store and therefore the existing dirty snapshot, reset, fieldset save/export lock and leave guard. Manual save failure retains the draft. Invalid stored mode/value fails the profile load instead of pretending to use auto mode.
- All three templates use the same displayed-age helper. No pagination, palette, templates or PDF renderer change.

## Database proposal
Migration: `../../supabase/migrations/20261026175325_profile_age_override.sql`, created with Supabase CLI 2.122.0.

Adds `profiles.age_mode` (default auto, not null) and nullable integer `manual_age`, with mode/value constraints. Existing birthday/content stays intact. Replaces the existing portfolio action function only to copy these two columns alongside all previously copied fields. Ownership checks, receipts/idempotency, grants and empty search path remain unchanged. No new table/policy or data deletion.

Read-only hosted inspection confirmed the current columns and existing action function before drafting. No migration or user-data mutation was executed in this round. Advisor checks were read-only; this work does not claim to resolve unrelated project findings.

## Actual validation
- Unit/PGlite/client receipt tests: 9/9 PASS (age 4, new helper/database 3, existing receipt 2).
- New browser suite on production build: 5/5 PASS, 16.5s. Covers save/reload, auto/manual switches, birthday changes, zero, invalid input/no write, failure/retry, malformed load/export guard, all templates, new portfolio reset and desktop/mobile viewports.
- Existing connected card actions regression: 7/7 PASS on the same application build in the preceding combined run.
- Full-repository TypeScript: PASS. Scoped lint: zero errors, four existing image warnings. Diff check: PASS.
- Inspected screenshots at 1440px/390px: mode/input/help text fit the form. Viewports are Chromium emulation, not physical devices.
- Production build: PASS after two failed builds exposed an overly complex inferred select type and misplaced `returns` in the SDK query chain. Explicit row result typing after filters fixed these without disabling checks. The final build includes the final source.
- Initial new browser cases failed because tests expected a standalone age span in Classic and an export button outside the final-step panel. Tests now check actual age text across each template and open the final panel before checking the export lock; no assertions were skipped. The first unit run also failed to transform top-level await in a CJS test; reading its SQL fixture synchronously fixed the harness.

Data/backend tests are synthetic mocks and PGlite. No new real PDF file or hosted API mutation acceptance is claimed.

## Activation order
1. Review and approve the migration above. Recheck live column/function/history state before applying; if already present, compare rather than reapply.
2. Apply that exact migration, verify constraints/defaults/RPC definition and grants, then refresh the API schema cache (migration includes NOTIFY).
3. In the app checkout add `NEXT_PUBLIC_MANUAL_AGE_ENABLED=true` to the existing untracked environment file and restart development server, or rebuild production. Do not enable on an unmigrated database.
4. Use an authorized test portfolio to save manual age, reopen, switch to auto/reopen, and duplicate. Verify both fields and original birthday. Keep hosted acceptance separate from local results.

The overall profile milestone remains PARTIAL until deployment and acceptance are completed. Migration is additive; returning to the prior UI must not drop the columns or erase saved manual values.
