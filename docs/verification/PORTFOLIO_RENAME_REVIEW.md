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

Async/account/navigation, keyboard/mobile, content preservation and fresh Editor/export filename evidence will be recorded after the second part. Part A must be published and fetched before starting B.

## Limits and publication

All backend interactions this round use synthetic localhost mock, not hosted Supabase or Storage. Client filters/returned-owner checks do not prove RLS. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified** per [readiness report](SECTION_VISIBILITY_INTEGRATION_READINESS.md); no installation is attempted.

No realtime/multi-tab conflict framework: different-tab names are visible after reload; concurrent renames of the same portfolio are last accepted server write. No revision/conflict guarantee is claimed. Creation/open/logout regressions are checked separately in B. Copy/delete, Autosave and broader portfolio management remain separate work.

Published A/B SHAs and fetched final HEAD/tree/clean status are provided in the final handoff. The report-containing commit cannot embed its own SHA; resolve it with `git log -1 --format=%H -- docs/verification/PORTFOLIO_RENAME_REVIEW.md`. Publication uses expected-parent, non-force update and complete-tree equality, preserving main and newer remote work.
