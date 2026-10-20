# Dashboard portfolio rename review

## Baseline and scope

Started at fetched local/remote `ed673f4216752d9ee547ce24b20af7b26c5a39f3`, branch `codex/portfolio-next-phase`, clean working tree. Preserve preceding error-copy work. Read AGENTS, relevant PRD, design system/architecture, M05.01, Dashboard/CreatePortfolioModal, Editor title loading/export filename, existing native PDF dialog, installed Next 16.2.9 client/router guides, installed Supabase/PostgREST update implementation and current official update documentation. Changelog scan: upcoming TLS cipher removal affects transport, not this unchanged update API; no package/transport changes needed. No old attachment is used as current source/schema evidence.

Original Dashboard wrapped every portfolio card in a Link with no rename action. Creation trims title and rejects whitespace-only text. This round adds only management-name editing of `portfolios.title`, separate from `covers.title`, cover first/last names and all content. Creation's existing UI maxLength is not copied into rename as a new product limit. No migration, RPC, dependency, schema/policy, deploy or hosted data write.

## Implementation

- `src/app/dashboard/page.tsx`: article contains an Editor Link and a sibling rename button. Target ID is explicit; no button-in-link nesting. Existing content/style stays. A confirmed response merges only title/server updated_at into its own card, without sorting/replacing unrelated cards.
- `src/components/portfolio/RenamePortfolioDialog.tsx`: native modal dialog follows LargePdfDialog style. Label/error association, modal focus, Tab wrapping, Enter submit, Escape/cancel and connected-trigger focus return. Existing null/empty title initializes an empty input, never the display fallback. Current full title wraps separately, input has no new maxLength/uniqueness rule.
- Trim before save; blank shows existing creation advice; same trimmed title closes without a request. Auth `getUser()` must match Dashboard owner. PATCH `{ title }` filters both `id` and `user_id`, then selects `id, user_id, title, updated_at` with `.single()`. A small shape check rejects missing/incorrect row, owner, title or timestamp type. No error=null/zero-row false success. No client timestamp.
- Server-confirmed UI: card keeps the previous name until the returned row is confirmed. Backend/network/auth/malformed failure keeps input and dialog, shows fixed Thai copy, unlocks retry. No raw message or new sensitive logging. Network failure does not establish rollback; backend might already have applied the name.
- Synchronous submit ref blocks duplicate jobs before React commit. Cancel/Escape/input disabled while saving; Escape is prevented, not presented as aborting a server request. Target lock synchronously prevents another target until close/completion.
- Dashboard has a narrow owner/lifetime guard: ignored load result after cleanup/account change, unsubscribe on unmount, auth change clears cards/dialog and asks to reopen Dashboard. Modal lifetime guard ignores old result after unmount. Parent callback additionally checks current owner before applying a row. No realtime/history interception or global auth redesign.
- `tests/mock-supabase.mjs`: synthetic portfolio timestamps, synthetic server PATCH timestamp and POST return-representation support, so reload/create checks use persisted mock data. This fixture does not implement/prove PostgreSQL RLS.

## Part A actual verification

- Production build: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack` PASS. Next 16.2.9, nine static routes. Existing middleware deprecation/npm proxy-env warnings.
- Standalone full-repo `node_modules/.bin/tsc --noEmit --incremental false` **PASS after build**.
- Scoped ESLint on Dashboard/dialog/new E2E/mock: **PASS, 0 errors/0 warnings**. An initial lint caught rendering a ref; target now captures owner in state from the event, no rule disabled.
- `git diff --check` PASS.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<temporary Chromium 153> node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts --reporter=line --max-failures=2`: **6/6 PASS (11.3s)** on production server. Success/trim/exact title-only request + ID/owner filters + returned representation, target-only change/reopen/reload, cancel, unchanged/blank validation, raw backend/network/no-row/malformed failure and retry. No skipped cases/assertion reductions.

## Part B

Part A published as **`d5b4bd7727c8b95dae7bbbfd1e70726a0ba961b0`**, tree `9f17f76ff4e3b42f9bad953a83fa4ad892daf608`. Fetched and compared complete contents, then aligned equivalent local commit to published history; local/remote equal and clean before B. No reset/force-push/main change.

### Actual browser results and corrections

1. Expanded rename suite on production build: **18 PASS / 1 FAIL (26.5s)**. The failed preservation/export case incorrectly inserted a synthetic visibility override under `section_key` instead of the existing `section` column. The existing visibility guard correctly rejected that fixture and blocked Paper/export. Corrected the fixture, preserved all assertions, and added explicit absence of the hidden profile page. **No application source fix**.
2. Reran only corrected preservation/export case: **1/1 PASS (5.8s)**. Ten content/library/selection/visibility tables remain byte-equivalent JSON before/after rename; Minimal stays selected, cover ALPHA and cover first name Alpha stay unchanged, profile remains hidden, selected education remains checked. Fresh Editor header loads the new management name. Real existing PDF creation/download yields `สมัคร-Science-2026.pdf` from management title `สมัคร/Science:2026`. No renderer/filename code changed. This is not a new large-PDF/visual-quality acceptance claim.
3. Added returned-representation shape case plus three existing Accordion/crop cases and existing large-file confirmation regression: **5/5 PASS (19.9s)**. Returned wrong owner/title, missing or non-string/non-null timestamp and array payload cannot acknowledge success; draft/old card survive and retry succeeds. Accordion never saves/fetches on collapse; text/crop object URLs survive mobile panels. PDF size mock still verifies cancel/Escape, lock, duplicate confirm and identical Blob without rebuilding after confirmation. No real 14 MB fixture is claimed.
4. Standalone final typecheck initially found three errors in the new test's generic DOM locator types (`requestSubmit`/`click`). Added real `instanceof HTMLFormElement/HTMLButtonElement` checks, no any/cast bypass or rule relaxation. Final full-repo typecheck **PASS (exit 0)** after the production build. Reran the affected synchronous-lock case **1/1 PASS (3.7s)**. No application source changed.

There are **20 distinct rename cases**, all with passing evidence across the runs above; not a claim of a clean 20/20 single invocation. Six original A cases passed again in the expanded run. No test is skipped and no assertions are reduced. Only test/docs/assets changed in B; `git diff --quiet d5b4bd7 -- src tests/mock-supabase.mjs package.json package-lock.json` passes, so the build tested is the final application source.

### Coverage details

| Concern | Evidence |
| --- | --- |
| Titles | Thai/English, outer trim, blank/whitespace rejection, unchanged no-op, legacy null/empty/whitespace, duplicate names accepted, 600+ character mixed Thai/English name without a new cap |
| Save/response | Exact title-only PATCH plus ID/owner filters/returned representation; old card until acknowledgment; backend/network/no row/wrong shape errors keep draft and allow retry |
| Concurrency | Same-tick `requestSubmit()` twice sends one PATCH; Cancel/Escape stay blocked while saving; programmatic other-card action cannot replace target. Changing target while a request is pending is therefore not reachable through this UI, rather than exposing a cancel that falsely claims backend abort |
| Session/lifetime | Gated auth and PATCH responses after account change cannot restore old cards/dialog/status; late result after actual browser Back to Editor cannot affect that Editor or a subsequently opened target |
| Current auth | Auth error/mismatched getUser result prevents PATCH and shows fixed copy, no raw message |
| Input/focus | Tab/Shift+Tab wrap, Enter submit/open, Escape cancel, trigger focus restored, error linked to label/input, reopening another target clears old error/draft |
| Persistence/data | Target A only, B unchanged, Dashboard reload/reopen, ten preserved mock tables, cover/title/name/template/visibility/selection checks, fresh Editor title and sanitized filename |
| Existing flows | Create trims/POSTs existing payload, opens new Editor, new card appears on Dashboard, logout reaches login |

### Visual verification

Opened actual [desktop 1440px](assets/portfolio-rename-desktop.png) and [mobile 390px](assets/portfolio-rename-mobile.png) screenshots. Thai/mixed long current title wraps within dialog; editing input scrolls normally; buttons visible and reachable; no horizontal document/dialog overflow. Native dialog supports vertical scroll on shorter screens. These are Chromium 153 desktop/mobile viewport emulations, not physical-phone evidence.

### Final commands/results

All browser tests use mock backend at localhost and the extracted Chromium 153 executable via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Unchanged repository Playwright config starts production `npm start`; no custom runtime config or dependency is added this round.

```sh
# Build once after application implementation; unchanged application throughout B:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack
# Full-repo, explicitly after build and after final test type fixes:
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint src/app/dashboard/page.tsx src/components/portfolio/RenamePortfolioDialog.tsx tests/e2e/portfolio-rename.spec.ts tests/mock-supabase.mjs
node --import tsx --test tests/editor-form-errors.test.ts tests/pdf-result.test.ts
git diff --check
# A: 6/6; B initial expanded suite: 18 pass / 1 fixture fail:
node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts --reporter=line --max-failures=3
# Corrected fixture: 1/1:
node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts --grep 'preserves every content' --reporter=line --max-failures=1
# Additional case + focused regressions: 5/5:
node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/pdf-size.spec.ts --grep 'untrusted returned|accordion opens one|cover, preface and profile drafts|confirmed cover/profile crops|oversize mock waits' --reporter=line --max-failures=2
# DOM narrowing-only test fix: 1/1:
node_modules/.bin/playwright test tests/e2e/portfolio-rename.spec.ts --grep 'synchronously locks' --reporter=line --max-failures=1
```

Final results: build **PASS**, standalone typecheck **PASS**, scoped lint **0 errors/0 warnings**, focused unit regression **11/11 PASS** (nine error-copy + two PDF result/format), diff/link checks **PASS**. No database test, hosted call or whole-browser-suite PASS is claimed. M05.01 changes TODO → PARTIAL with this report linked; real integration/device checks remain. M05 overall stays IN_PROGRESS, copy/delete/Autosave remain separate.

## Limits and publication

All backend interactions this round use synthetic localhost mock, not hosted Supabase or Storage. Client filters/returned-owner checks do not prove RLS. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified** per [readiness report](SECTION_VISIBILITY_INTEGRATION_READINESS.md); no installation is attempted.

No realtime/multi-tab conflict framework: different-tab names are visible after reload; concurrent renames of the same portfolio are last accepted server write. No revision/conflict guarantee or same-title concurrency acceptance on a hosted server is claimed. An already-open Editor retains its loaded title until reopened/reloaded, per unchanged lifecycle. Dashboard initial-load/creation error copy outside the new rename flow is unchanged. Copy/delete, Autosave and broader portfolio management remain separate work.

Published A/B SHAs and fetched final HEAD/tree/clean status are provided in the final handoff. The report-containing commit cannot embed its own SHA; resolve it with `git log -1 --format=%H -- docs/verification/PORTFOLIO_RENAME_REVIEW.md`. Publication uses expected-parent, non-force update and complete-tree equality, preserving main and newer remote work.
