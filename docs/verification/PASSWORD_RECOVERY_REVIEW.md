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
