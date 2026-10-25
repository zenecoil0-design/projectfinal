# Portfolio actions Dashboard connection — gated, not installed

## Behavior

Adds a Dashboard management panel using Sol's existing native dialogs. Select a portfolio then duplicate or delete. Only a validated confirmed RPC receipt navigates to the copy or removes the deleted card. Library and Storage are never mutated by the client.

`NEXT_PUBLIC_PORTFOLIO_ACTIONS_ENABLED=true` enables the panel at build time. Default is off. Do not enable against a hosted database until the portfolio-actions migration and real API acceptance are completed. Visibility installation does not install this RPC.

Pending request identity and exact arguments are persisted before mutation under an owner-scoped localStorage key. Storage failure prevents mutation. One pending operation per owner/browser origin is allowed. Web Locks serialize cooperating tabs; unsupported browsers are blocked with explanation. Request storage is untrusted and validated. Auth.getUser is verified before each read/replay and account/lifetime invalidation suppresses stale UI results.

After uncertain responses, a reload restores the pending request. Verification reads receipts only; no row means uncertain, never rollback. Explicit replay sends the same request ID/action/source/title to the idempotent RPC. Confirmed/rejected receipts must match the exact request; malformed results and network errors remain uncertain. Completed requests are removed only if their ID still matches local storage. Backend requests accepted before navigation may still finish.

## Actual validation

Production build with the feature flag enabled: PASS. Full repository TypeScript: PASS. New parser/storage unit tests: 2/2 PASS. Initial connected browser tests: 3/3 PASS. Expanded production browser run: 40/40 PASS in one run (Dashboard load 15, connected actions 5, rename 20), 42.5 seconds. Scoped lint: no errors, one effect-ref cleanup warning on the intentional generation counter. Diff check: PASS.

Connected tests cover confirmed deletion, uncertain copy/reload/read-only verification/same-key explicit replay, cancellation, unavailable persistence, account change during pending work, mobile layout and receipt recovery without mutation. Existing Dashboard/rename regression includes create/open/logout and PDF filename preservation. No application changes after this production build; later changes are tests/docs only. An earlier lint run caught ref access during render; replaced it with verified-owner state before the passing build.

All browser backend interactions are mocked. This does not prove real RPC installation, two-tab behavior, concurrent PostgreSQL locking or real Storage. No full PDF suite or new large-file fixture was run.

## Remaining release gates

- Real PostgreSQL/PostgREST acceptance of portfolio-actions RPC: replay/concurrent calls, ownership, receipt visibility and atomic rollback. PGlite tests are separate evidence.
- Compare full hosted column types and all cascades with the migration contract before installation.
- Hosted installation approval and post-install browser acceptance.
- Test cooperating tabs and remaining pending-request UI edge cases before broad enablement.

No schema change was installed in this round. No dependency change, reset, actual portfolio deletion or Storage deletion occurred. Default UI remains unchanged until explicitly enabled. Local storage can be cleared by the user/browser; recovery across cleared storage or another device is not guaranteed. Requests from separate devices can represent separate intentional copies.
