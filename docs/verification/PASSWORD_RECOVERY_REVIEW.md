# Password recovery — 26 October 2026

Base: b268afdbb07b10c5301ef3e05b855573cdf74386. Branch: codex/portfolio-next-phase.

## Part A: implemented and locally verified

Login now links to /forgot-password. The request uses the existing Supabase SSR browser client and resetPasswordForEmail with a fixed same-origin /reset-password redirect. Successful requests and user_not_found return identical conditional copy. Other errors use fixed Thai text. Email draft survives errors, and a synchronous lock prevents duplicate submissions.

/reset-password lets the existing SDK exchange its PKCE code once and waits for PASSWORD_RECOVERY before offering an update. Ordinary direct visits and missing/invalid recovery links cannot update a password. Query/fragment values are removed after initialization; error text and tokens are not logged or rendered. The page checks getUser ownership before updateUser, checks its returned user, ignores old results after unmount/account changes and clears password fields on success or owner change. Auth callbacks do not call asynchronous Supabase operations. Existing verified session is retained after success; the page does not claim all devices are signed out. Minimum six characters matches registration; server policy still applies.

Recovery is deliberately browser-bound: open the email link in the browser/device that requested it. After refreshing a consumed recovery page, request a new link. No new schema, dependency, admin key or migration.

## Verification

- Production webpack build PASS; rebuilt after strengthening the account-change retirement guard.
- Full-repository TypeScript PASS after final build.
- Scoped ESLint PASS; diff check PASS.
- npm test: 66/66 PASS (unit/PGlite, synthetic local data).
- Initial browser run: 4 passed / 7 failed. Six failures used an ambiguous alert locator matching Next route announcer; one mock error used code without the corresponding API-version header. Scoped alerts to main and corrected legacy error_code fixture. No assertions removed.
- Browser after fixture corrections: 11/11 PASS. After final application guard change and rebuild: 11/11 PASS again (9.0 seconds). Eight recovery cases plus three existing auth accessibility cases.
- Real installed SDK with intercepted localhost Auth responses; not email delivery or hosted Auth acceptance.

## Required deployment and acceptance steps

1. Add the actual app origin and /reset-password to Supabase Auth Redirect URLs for each deployed environment. Keep Site URL correct. Do not copy localhost into production configuration.
2. Default recovery email must use Supabase's verification/ConfirmationURL flow that returns the PKCE code to the requested redirect. A custom token_hash-only template needs a separately reviewed callback; it is not implemented here.
3. With an owner-approved test email, request recovery and open the delivered link in the same browser/device. Confirm new password works after signout and old password fails. Test expired/consumed links and server rate limits. No real recovery emails have been sent by this task.
4. Check configured password policy, SMTP delivery and redirect behavior on the deployed hostname and a real phone. Do not declare M11 complete before this evidence.

References checked: Supabase password-based auth and resetPasswordForEmail documentation, installed auth-js PKCE implementation, and Supabase changelog (including pending TLS cipher retirement, which requires no change to this modern browser flow).

M11.03/M11.04: application implementation and mock coverage provided, hosted acceptance pending. M11.05 remains pending. Portfolio-actions Docker acceptance remains paused at the user's request; no actions migration or feature enablement occurred here. Autosave, image subsets and library snapshots remain deferred.

## Part B: lifecycle acceptance and recovery of temporary workspace

Part A was published as 48395697e1ccafa95601697aeecd0cc5dda27613 and its complete tree verified before B. B adds expired/consumed-code responses, page refresh with retained login, late getUser/update responses after account change, malformed/wrong-owner responses, keyboard checks and 390px/1440px layout checks. No application source changes in B.

Before the workspace disappeared, the expanded run had 48 passes / 1 failure. The failing assertion expected a generic save error; the installed SDK emits USER_UPDATED with the malformed user, so the owner guard correctly retires the recovery page. The test was split into malformed/wrong-owner cases requiring invalidation, no success and no editable password fields; both passed in a focused run. These are historical results, not the final recovered run.

The temporary B checkout and screenshots disappeared before publication. Part A remained intact remotely. B tests were reconstructed from the recorded changes in a new checkout, and a new production build/test run is required below. No original result files are claimed to be retained.

### Final reconstructed B results

- Fresh production webpack build PASS, full-repository TypeScript PASS, scoped ESLint PASS, diff check PASS.
- Final production browser run: 49 passed / 1 failed out of 50 in 3.1 minutes. All 17 recovery cases and 3 existing auth accessibility cases passed; the remaining 30 are create regression cases.
- Failure: existing create blank-validation test timed out waiting five seconds for the Dashboard list. Captured page remained in list-loading state. Focused rerun, with no source/test/timeout changes, passed 1/1 in 5.0 seconds. Do not infer a proven root cause or describe this as a single 50/50 run.
- Screenshots regenerated and visually inspected at 390x900 and 1440x900: fields, controls and keyboard focus fit the viewport. Screenshot generation remains in the tests; image binaries are not included in this commit.
- No application source changes after the build. The 66/66 unit/PGlite result above belongs to Part A on the same application source, not a second run in B.
- This closes local implementation/mock acceptance of recovery, not hosted email delivery, password policy, deployment or real-device acceptance. It does not resume Docker or enable portfolio actions.
