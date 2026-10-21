# Portfolio create resilience review

## Baseline / callers

Started at fetched remote and clean worktree HEAD `415a3f2698c66d5120cc31e5ded99fda21c81c3d`, target branch `codex/portfolio-next-phase`. Reused isolated `dashboard-retry` worktree. Older dirty `portfolio-readiness` checkout is preserved unchanged; no reset/clean/force/main modification. Read AGENTS, relevant PRD/design/Next 16.2.9 router/client guidance, Supabase insert/auth-event docs and installed SDK missing-session handling. Changelog scan: upcoming TLS cipher deprecation does not change this request API.

Actual shared component: `src/components/portfolio/CreatePortfolioModal.tsx`. Its three import sites are Dashboard, HomeSidebar (desktop Home sidebar) and RecentPortfolios (Home create card, including mobile). `src/components/home/CreatePortfolioModal.tsx` is a different, unused component in this route path and is not edited. HomeHeader links directly to Editor rather than this modal; that separate link is not claimed as a modal caller.

## Cause / implementation

Original catch exposed arbitrary backend/auth message; `isCreating` alone did not synchronously lock handler entry. Name/template remained editable during a pending request, owner/lifetime guards were missing, and any truthy response ID could cause navigation.

- Capture trimmed title/template at submission. Retain original blank-name guidance and existing creation input maxLength=100; no new naming/uniqueness rule. Ref lock is acquired before first await; trigger/name/template/cancel/close handlers additionally consult it, not only React disabled props. Pending input/template/cancel/close controls are disabled and status announced. Escape/backdrop cannot close during pending work; normal close/reopen keeps same-account draft.
- Per-instance auth subscription tracks session owner and a lifetime/version token. Owner from local events is a binding hint, not authorization; `getUser()` still verifies it before insert. A not-yet-initialized binding fails safely without an insert. No async Supabase call inside auth callback. Same-owner refresh does not reset draft. Account change/signout invalidates pending results, closes modal and resets name/template/error even on Home, independently of Dashboard guards. A returned verified owner different from captured owner also discards the old account draft before any insert.
- Auth verification/network failure shows fixed Thai `createAuthError`, retains draft and does not redirect. A genuinely missing user/session (including the SDK's AuthSessionMissingError) retains original `/login?next=/` route. Do not equate transient auth failure with signout.
- Payload is still exactly `{ user_id, title, template_key }`. Select now returns `id, user_id, title, template_key`, so response can be checked against the captured request. ID must be non-empty trimmed string; owner/title/template must match. No UUID format requirement. Navigation uses encoded ID, only after acknowledgment. Extra selected fields verify this operation, not RLS.
- Insert failure/malformed/empty response uses fixed Thai `createResultError`: “ยืนยันการสร้างพอร์ตไม่สำเร็จ ชื่อและเทมเพลตที่เลือกยังอยู่ กรุณาตรวจรายการพอร์ตก่อนลองสร้างซ้ำ”. No raw message/logging, false rollback/no-create promise, automatic retry or success UI. Manual retry is allowed after failure; backend may already have inserted a row, so duplicate creation after an uncertain result is still possible.
- Unmount/account change invalidates current token; old auth result cannot insert, old insert result cannot navigate/show error or unlock a newer job. Cleanup unsubscribes and releases refs. Server requests already accepted may complete for the old owner; this does not cancel backend work. No server idempotency or conflict framework.
- Existing visual structure/theme is retained; unique input/label/error IDs, dialog name, close accessible name, pressed template state and pending status added locally. No global modal rewrite or dependency.

## Part A actual checks

- Production build: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack` PASS, nine static routes. Existing middleware deprecation/npm proxy warning.
- Standalone full-repo `node_modules/.bin/tsc --noEmit --incremental false` after build: PASS.
- Scoped ESLint on shared component/helper/new unit/browser tests: zero errors/warnings. `git diff --check`: PASS.
- `node --import tsx --test tests/portfolio-create.test.ts`: **2/2 PASS**. Checks unknown response shape, non-string/empty/padded ID, matching captured owner/title/template. No DB call.
- Production browser `portfolio-create.spec.ts`: **9/9 PASS in one run (32.7s)**. Exact captured/trimmed payload + select + returned-ID navigation, blank/no insert, normal draft reopen, same-turn duplicate submit/pending disabled controls, backend/network/empty/malformed insert failures with draft/manual retry, backend/network auth failure without insert/login/raw leakage. Zero skip/assertion reduction.

Part A is published and fetched before starting B. Actual A/B SHAs and final fetched HEAD/tree/worktree status are supplied in the handoff; report commit cannot embed its own SHA. Configured GitHub publication checks blob and complete-tree equality and uses expected-parent non-force update.

## B / boundaries

Caller/session/navigation/viewport regression results will be recorded after execution. Backend tests are localhost mocks, not hosted database/Storage/RLS acceptance. Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified** per [readiness](SECTION_VISIBILITY_INTEGRATION_READINESS.md). No schema/RPC/RLS/migration/dependency/Editor/PDF change, real writes/deploy, Autosave/copy/delete or new real 14 MB fixture. Existing Home RecentPortfolios loading/auth behavior outside the create modal is not refactored.
