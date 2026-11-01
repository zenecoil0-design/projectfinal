# Library upload lifetime guards — 1 November 2026

Base: `9756aec878f269022f012e6765b48813a57cc3c2`. Work branch: `codex/portfolio-next-phase`.

The existing save lifetime check stopped stale primary-row responses, but intermediate image uploads/removals and education logo updates could still start later database requests after unmount/account replacement.

Activity and Certificate uploads now receive the current-lifetime predicate and check it before each upload, after the upload resolves and before inserting image rows. The callers check again after image removal and upload, before starting tag mutations. Education checks after logo upload and after the logo database response. Activity also checks after tag removal before tag insertion. Existing error/finally guards remain in place.

This stops subsequent requests; it does not cancel or roll back a request already accepted by the backend. Uploaded files are retained. No new cleanup, atomic-save claim, schema change or Snapshot activation is included.

## Verification

Reconstructed the previously uncommitted patch after the temporary checkout was lost, then verified this source anew:

- Production build (`npm run build -- --webpack` with localhost mock configuration): PASS.
- Full repository TypeScript after build: PASS.
- Scoped ESLint: zero errors, six existing image warnings.
- Production Chromium tests: **12/12 PASS in one run**, 35.0 seconds. Includes three new late-upload/account-change cases and nine existing cropped-file/history/late-save regressions across all three sections.
- New tests pause Storage response, switch account, open a new draft, then release the old upload and assert no subsequent REST mutations and preservation of the new owner's draft.
- `git diff --check`: PASS.

Browser command:

```sh
node_modules/.bin/playwright test tests/e2e/my-data.spec.ts --grep 'late upload|late.*save cannot|history keeps Tags'
```

Tests use a localhost mock and Chromium, not hosted Storage/RLS or actual devices. No application source changed after the successful build. This is a bounded save-lifecycle fix; Snapshot atomic library callers, Editor integration and installation remain unfinished as described in [the prior checkpoint](SNAPSHOT_TRANSITION_READ_REVIEW.md).
