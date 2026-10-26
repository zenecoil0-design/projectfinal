# Dashboard card icon actions

Scope: replace the global portfolio selector and full-width action bars with four adjacent square icon controls on each card: edit (pen), rename (letter A), duplicate (copy), delete (trash). Each control is 44×44px with accessible name, native title and keyboard focus styling. Duplicate/delete remain gated by the existing public feature flag.

One shared PortfolioActionsPanel still owns pending receipts, cross-tab Web Locks, session guards and dialogs. Cards pass their own ID directly; there is no separate selected-portfolio state. Existing RPC payloads, confirmation dialogs and uncertain-result recovery are unchanged. The create modal remains mounted through list retries.

Validation is against synthetic localhost data, not hosted mutations. Hosted acceptance remains pending in PORTFOLIO_ACTIONS_INSTALLATION_CHECKPOINT.md.

## Results
- Final production build and full-repository TypeScript: PASS.
- Final production browser run: 42/42 PASS in 48.5s (Dashboard loading 15, connected actions 7, rename 20).
- New desktop/mobile cases verify four square SVG controls on one row, direct edit URL, duplicate name from card B, Escape/focus return, and deleting B while A stays. Opened screenshots at 1440px and 390px; controls fit without overflow.
- Scoped ESLint: no errors, one existing epoch-ref cleanup warning. Diff check: PASS.
- First run: 33 passed / 9 failed. Fixed selectors that assumed one button per card and an obsolete Minimal name; fixed cancel focus by leaving dialog triggers enabled (native modal makes background inert), while pending/busy locks remain. One final first-run case could not find a Dashboard card during the rebuild interval; final run used a completed build and passed unchanged.
- Two builds were necessary because the focus correction changed application source. No application changes after the final build.

The tests select rename by accessible name, retaining the existing ownership/draft/payload assertions. No schema, migration, dependency or backend mutation logic changed. Screenshots are local test artifacts; no real user data was used.
