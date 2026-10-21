# Dashboard load / retry review

## Baseline and workspace preservation

Fetched remote/start HEAD: `8c3297f10c4d733cb12aaab4bc4a846f0e25cfc1`, publication branch `codex/portfolio-next-phase`. Existing `portfolio-readiness` checkout was at fa18789 with unfinished error-test/report/assets modifications. Left those files untouched; used a separate detached worktree `dashboard-retry` from the fetched branch. Main is untouched, no reset/clean/force-push. Final clean status refers to this isolated worktree, not a claim that the older checkout was cleaned.

Read AGENTS, relevant PRD/design/architecture and installed Next 16.2.9 router guide, Dashboard/rename/create lifecycle, existing mock and official Supabase select documentation. Changelog scan found upcoming TLS cipher removal, unrelated to this unchanged API contract. No old attachments replace current source/schema evidence.

## Cause / implementation

Previously Dashboard used arbitrary `error.message`, fell back to `data ?? []`, always showed the initial count zero after a query failure, and had no retry. Full-page loading also would unmount a create dialog if reused for retry.

- Dashboard separates initial auth loading/error from list `loading / success / error`. The same owner-filtered/order-by query reads the same five fields. A list failure does not redirect or claim expired auth. Auth failure has its own fixed Thai message; a genuinely missing user retains login navigation.
- `src/lib/dashboard-portfolios.ts` parses unknown payloads before publishing success: array required; every row must contain usable ID, nullable text title/template/timestamps. Empty/long/whitespace titles, nullable dates and unknown template keys remain valid. No new title limit/uniqueness/UUID/date-format rule. Only successful `[]` means zero portfolios.
- Fixed list copy: “โหลดรายการพอร์ตไม่สำเร็จ กรุณาลองอีกครั้ง”. No external error message/new private logging. Counts and empty copy render only in success. Existing rows are not erased on retry failure.
- Retry calls only the list loader, no page reload/auth reinitialization. Disabled loading button/status and synchronous closure lock prevent duplicate jobs before React state commits. No automatic refresh/realtime.
- CreatePortfolioModal remains in the same mounted position during list loading/error/success; its name/template draft is not reset. Initial auth still gates the first page; list retry never uses full-page loading.
- Owner/lifetime/request guards reject old reads after account change/unmount and clean up subscription/retry callback. Rename guards stay. Session-local confirmed rename patches overlay only title/server timestamp on read results, so read snapshots cannot undo an acknowledged rename; map is cleared with session cleanup. No persisted cache/conflict framework.
- Mock POST fixture now supplies synthetic nullable timestamps for newly created portfolios, matching the five-field Dashboard projection. Existing create/rename API payloads are unchanged; mock is not RLS evidence.

## Part A actual checks

- Production build `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack`: PASS, all nine static pages. Existing middleware/npm proxy-env/cache-size warnings.
- Full-repo `node_modules/.bin/tsc --noEmit --incremental false` after build: PASS.
- Scoped ESLint: PASS, zero errors/warnings; `git diff --check` PASS.
- Unit `node --import tsx --test tests/dashboard-portfolios.test.ts`: **3/3 PASS**, no database calls. Covers genuine empty vs malformed data, UI-compatible nullable/long names/unknown template and wrong field types.
- First production browser selection: **1 PASS / 2 FAIL / 3 NOT RUN (15.7s)**, stopped at max-failures=2. New tests' global alert locator also matched Next route announcer. Scoped locator to Dashboard main, preserving text/raw-error/count/retry assertions; no application fix.
- Corrected `dashboard-load.spec.ts`: **6/6 PASS (26.2s)** on production server: populated/empty success, backend/network/null/object/malformed-row failure, safe copy/no false zero, retry failure then success. Same build/source. Temporary extracted Chromium 153, unchanged Playwright config, no app dependency added.

Part A must be published/fetched before B. Actual published SHAs are recorded in handoff and B update; report commit cannot embed its own final SHA. Publication uses configured GitHub connector with blob SHA/complete-tree checks and expected-parent non-force branch update.

## Part B / remaining boundaries

Async/session/create draft/rename/keyboard/mobile regression results and screenshots will be recorded after execution. This is mock localhost testing, not hosted Supabase/PostgreSQL/RLS/device acceptance. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified** per [readiness](SECTION_VISIBILITY_INTEGRATION_READINESS.md). No migration, database/Storage real write, Editor/PDF change, dependency, Autosave, copy/delete or realtime work.
