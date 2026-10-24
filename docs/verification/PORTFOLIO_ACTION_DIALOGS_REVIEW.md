# Portfolio action dialogs — UI readiness (2026-10-24, Asia/Bangkok)

## Status and commits

**UI components พร้อมเชื่อมต่อและผ่าน mock tests — ยังไม่ใช่ทำสำเนา/ลบพอร์ตพร้อมใช้จริง**

- Repository: `zenecoil0-design/projectfinal`; branch: `codex/portfolio-next-phase`.
- Workspace maintenance removed the earlier checkout; re-cloned the current branch. Actual starting local/remote HEAD: `fb66062cc2d1d642c4c9a8fd6ab17336313d201a`, clean tree. Preserved its newer library Tag/draft fix; did not revert to an older handoff SHA.
- A published and remote/tree verified before B: `fdef92872b611a08a793afe7841166591a85c57e`; tree `dd14e344def711b8942f6c7727bb2e56523ae462`.
- B is the commit containing this report, expanded tests and a one-line guard making repeated Cancel deliver onClose once. Its actual published SHA and final local/remote/working-tree verification are in the delivery message. A fresh production build and full checks follow that source change.

## Files and separation

- `src/components/portfolio/PortfolioActionDialog.tsx`: two named exports, `DuplicatePortfolioDialog` and `DeletePortfolioDialog`, sharing a small private dialog body. Uses native dialog, Rename's existing styling conventions, labeled input and safe Thai status/error messages. No auth/client/database/Storage/router imports.
- `tests/harness/portfolio-actions.tsx`: Strict Mode client harness with injected synthetic callbacks, pending promises and owner/target/lifetime controls.
- `tests/harness/tsx-loader.mjs` and `portfolio-actions-server.mjs`: bundle real components using Next's already installed SWC/webpack; serve only on loopback port 3011, using the production build's CSS. Temporary bundle is outside the repository and removed on server shutdown.
- `tests/component/portfolio-actions.spec.ts`, `tests/portfolio-actions.config.ts`: isolated browser suite, separate from normal production E2E discovery.
- This report only; no restricted overall-plan publication, database metadata or security findings.

Dashboard, RenamePortfolioDialog, CreatePortfolioModal and callers were inspected and left unchanged. No duplicate/delete implementation already existed. No new production route, button, mock-success flow, schema, migration, RPC, Storage call or application dependency. Production build still lists the existing Home/Dashboard/Editor/auth/my-data routes only.

## Proposed UI callback contract (not an approved backend contract)

Both dialogs receive `open`, `ownerId`, `portfolio: { id, title: string | null }`, `trigger: HTMLButtonElement | null`, `onClose`, and `onConfirmed({ portfolioId })`.

| Dialog | Mutation callback arguments | Optional read-only verification arguments |
| --- | --- | --- |
| Duplicate | `onSubmit({ sourceId, title })` | `onVerify({ sourceId, title })`, identical captured request |
| Delete | `onSubmit(portfolioId)` | `onVerify(portfolioId)` |

Callbacks return `Promise<unknown>` so the UI validates confirmation at runtime. Exported `PortfolioActionResult` documents the suggested adapter return shape:

```ts
type PortfolioActionResult =
  | { status: 'confirmed'; portfolioId: string }
  | { status: 'rejected' }
  | { status: 'uncertain' };
```

- `confirmed`: explicit confirmation and nonblank string ID required. Duplicate must return a different ID from source; delete must return the exact target ID. Undefined/null/malformed/mismatched replies are uncertain, never success.
- `rejected`: adapter has confirmed failure/non-application and can safely allow an explicit user retry. Do not map every backend/network error to this status.
- `uncertain` or thrown promise: result is unknown. UI retains the draft/target and disables mutation confirmation. Optional `onVerify` performs reconciliation only, never repeats the mutation. Confirmed verification delivers success once; rejected verification unlocks user retry; uncertain/failed verification remains blocked. Without a verifier it stays waiting and can be closed.

Illustrative future composition, using adapters Astra supplies after backend acceptance:

```tsx
<DuplicatePortfolioDialog
  open={duplicateOpen} ownerId={verifiedOwnerId} portfolio={target} trigger={trigger}
  onSubmit={duplicateAdapter} onVerify={verifyDuplicateAdapter}
  onClose={() => setDuplicateOpen(false)}
  onConfirmed={result => { setDuplicateOpen(false); showConfirmedCopy(result.portfolioId); }}
/>
<DeletePortfolioDialog
  open={deleteOpen} ownerId={verifiedOwnerId} portfolio={target} trigger={trigger}
  onSubmit={deleteAdapter} onVerify={verifyDeleteAdapter}
  onClose={() => setDeleteOpen(false)}
  onConfirmed={result => { setDeleteOpen(false); removeConfirmedCard(result.portfolioId); }}
/>
```

No endpoint/RPC is proposed here. Adapter/parent must verify owner/authorization, validate actual backend representations, reconcile unknown outcomes and keep unresolved attempts outside dialog state across close/reopen/reload. In particular, unmounting this UI is **not** backend cancellation or evidence that retry is safe. This component provides only a per-lifetime client lock, not server idempotency, cross-tab conflict handling or durable uncertainty tracking. Parent should clear targets on account change and prevent a new attempt while an old result remains unresolved.

## Lifecycle and interaction

Duplicate suggests original trimmed title plus `สำเนา`, or `พอร์ต สำเนา` when absent. It shows the original title separately and explains shared library/image references. User name is trimmed only at submission; whitespace-only is rejected; no new uniqueness/length rule. Delete explains that library items remain and makes no Storage-cleanup promise; initial focus is Cancel.

A synchronous ref locks before await. Name, confirm, Cancel and Escape are disabled/blocked during pending; no fake backend cancellation. Errors say `ยืนยัน…ไม่สำเร็จ`, retain draft, and never expose exceptions. Uncertainty lock also uses a ref, preventing a stale render's handler from resubmitting. Success delivery is latched before invoking the captured callback, so repeat submits cannot deliver it again. Cancel invalidates the lifetime synchronously and checks that lifetime before delivering onClose, preventing repeated close callbacks in the same turn. Parent closes on success; if it does not, confirmed status remains with mutation disabled.

`open=false` removes the inner dialog. Owner/target ID changes remount it using a stable identity key. Layout-effect generation/lifetime guards reject old async responses, including when a new attempt is already pending; Strict Mode cleanup is exercised by the harness. Native dialog closes and restores a still-connected trigger on cleanup. Tab/Shift+Tab wrap, Escape cancels only when not pending, and Enter follows the focused form control. No timers or global navigation/auth subscriptions are introduced.

## Actual checks and rounds

| Check | Result |
| --- | --- |
| A production build, Next 16.2.9 webpack | PASS; existing middleware deprecation/cache warnings. |
| A full-repo TypeScript / scoped lint / diff check | PASS; lint 0 errors/warnings. |
| A isolated browser | 7/7 PASS in one run (3.7s). |
| B first expanded browser | 27/27 PASS in one run (10.9s). |
| B first full-repo TypeScript | FAIL: 5 TS2339 diagnostics in new tests because Playwright's generic element type did not expose requestSubmit. Fixed by a shared helper that checks `instanceof HTMLFormElement`, without casts/any/ignores or reduced strictness. |
| B expanded browser after typed helper fix | 29/29 PASS in one run (11.7s), including explicit thrown mutation failures. |
| B focused visual recheck | 2/2 PASS (2.8s); regenerated pending/error screenshots at both widths for inspection. |
| B final production build after close guard | PASS; no new routes and no application changes after this build. |
| B final isolated browser | **29/29 PASS** in one run (12.2s), including same-turn double Cancel. |
| B final full-repo TypeScript / scoped lint / diff check | PASS; lint 0 errors/warnings. |
| Existing production create/rename/open/logout smoke before final close guard | 3/3 PASS in one run (5.4s), localhost mock backend; rerun on final build recorded below. |
| Final production create/rename/open/logout smoke | **3/3 PASS** in one run (5.6s), on the final build after the close guard. |

Initial harness preparation failed before tests could run: SWC bindings initialization, then Playwright config working-directory/module resolution. Corrected the test-only loader/config before the 7-test A pass. Playwright's browser download produced truncated archives; used Chromium 153.0.8010.0 in an external scratch runtime instead. No application dependency/lockfile change. No browser-test failures were hidden or skipped.

Commands from repository root:

```sh
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint src/components/portfolio/PortfolioActionDialog.tsx tests/harness/portfolio-actions.tsx tests/harness/tsx-loader.mjs tests/harness/portfolio-actions-server.mjs tests/component/portfolio-actions.spec.ts tests/portfolio-actions.config.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<local-chromium> node_modules/.bin/playwright test --config tests/portfolio-actions.config.ts --reporter=line
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<local-chromium> node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts:21 tests/e2e/portfolio-rename.spec.ts:226 tests/e2e/portfolio-create.spec.ts:36 --reporter=line
git diff --check
```

Coverage includes Thai/English/long/null/blank names; trim/validation; confirm/cancel; same-turn duplicate requests; pending controls; definite failure/retry; uncertain replies and read-only verification; invalid confirmations; late results after close/unmount/target/owner change; payload snapshots; one-time success; keyboard/focus and 1440px/390px layout. No assertions removed or skips added.

Opened representative pending/error screenshots for both actions at 1440px and 390px. Long original titles wrap, inputs retain their complete values without a length ceiling, errors remain readable and controls fit horizontally. Screenshots are reproducible harness artifacts `{duplicate,delete}-{1440,390}-{pending,error}.png`; no image assets were added to the application.

## Remaining acceptance

The component tests use synthetic callback results, not database or API integration. The three production smoke cases use the existing localhost backend mock. No hosted data, database suite, PDF fixture, RLS/atomicity/Storage proof or physical-phone test was performed. Chromium desktop/mobile emulation was used; Firefox/Safari/screen-reader software were not tested.

Astra still owns backend contracts, ownership/atomicity, durable reconciliation/idempotency decisions, Storage behavior, Dashboard integration and acceptance before exposing these actions. Section Visibility API acceptance/hosted integration remains NOT_RUN/unverified. No overall M05/Dashboard/portfolio-management completion claim; no colors/manual age override/other feature started.
