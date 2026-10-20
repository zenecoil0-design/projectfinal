# Section Visibility — integration readiness (2026-10-20)

## Authority and starting point

Starting local/freshly cloned remote: `1f73be9e5f519286cc47855bd58b4bd9cb684293`, `codex/portfolio-next-phase`, clean tree. Preserve all prior changes; no main change, reset or force-push. Read AGENTS, visibility review, relevant PRD/architecture/design, installed Next 16.2.9 installation guide, existing migration/test setup and Supabase security guidance.

This round authorizes **hosted metadata reads only** and isolated local integration preparation. It does not authorize hosted installation, accounts, writes, wake/restore, deployment or deletion. Previous [UI/PGlite/mock/PDF evidence](SECTION_VISIBILITY_REVIEW.md) remains historical evidence, not a new real-API integration result.

## Evidence ledger — Part A

| Source | Actual observation | What it does NOT establish |
| --- | --- | --- |
| Target project inventory, get_project | Portfolio / `dlauefjrcstfcmhafyan`, org `frjhiogdmewprolygrnq`, ap-southeast-1, ACTIVE_HEALTHY, PostgreSQL 17.6.1.155 | No table, RLS, grant or migration compatibility |
| Target execute_sql, READ ONLY transaction | Minimal current_database/current_user/to_regclass probe timed out | No claim visibility table is absent/present |
| Target list_migrations | Connection timeout | No claim migration uninstalled or installed on target |
| Target security advisor | Backend reported hibernated; no advisor findings returned | No security-advisor PASS; this differs from inventory status and needs operator confirmation |
| Connectivity | MCP endpoint returned HTTP 401 without credentials (reachable OAuth endpoint) | Does not prove target SQL connectivity; no credential extraction attempted |
| Repository | Migration `20261020084510_section_visibility.sql`, six optional IDs, composite PK, UUID portfolio FK, boolean default, ownership RLS, authenticated SELECT/INSERT/UPDATE only | Not a current catalog dump |
| Local fixture | Explicitly synthetic PGlite catalog/roles | Not PostgreSQL/PostgREST/JWT or target integration |

Stopped after SQL/history failures and the distinct advisor diagnostic; no repeated SQL loops, restore or unsupported alternate credential path. Changelog markdown fetch could not be read by the web tool (unsupported content type); official Data API security guide was accessible. No platform feature/API change is implemented here.

## Read-only preflight

Files: [SQL](../../scripts/inspection/section-visibility-preflight.sql), [runner](../../scripts/inspection/section-visibility-preflight.mjs). Configure an approved metadata connection privately using `PGSERVICE`/psql normal configuration. Never paste credentials, JWTs, connection strings or raw private results into this report.

```sh
VISIBILITY_PREFLIGHT_TARGET=dlauefjrcstfcmhafyan node scripts/inspection/section-visibility-preflight.mjs
```

The target label is an explicit operator attestation, **not proof the connection points there**. Independently verify host/project in the approved connection UI before running. SQL uses READ ONLY transactions, ten-second server timeout, no application row reads, no function/migration bodies and no DDL/DML. psql uses -X (no startup file), twenty-second client timeout and sanitized failures. Only selected catalog settings (`pgrst.db_schemas`) are inspected, never arbitrary environment/server configuration. History returns version/name/statement digest, not SQL bodies. Repository SHA-256 is not comparable to joined stored-statement MD5: differing serialization is possible; no automatic content-equivalence claim is made.

| Check | Expected / stop condition |
| --- | --- |
| Target identity | Independently verified project/connection; unknown = STOP |
| portfolios | Ordinary table, UUID id/user_id, validated single-column id PK/unique, RLS on; mismatch = STOP |
| Ownership lookup | authenticated non-bypass role, schema usage/auth.uid execute/portfolios SELECT, review effective policies and role memberships; inadequate/unknown = STOP |
| Visibility relation/history | For first installation both name and version must be absent; either exists = STOP and compare, never overwrite/drop/rerun |
| Existing visibility object | Compare columns/defaults/PK/FK/CHECK/RLS/policies/ACL/index validity to repo; any drift needs separate review, not CREATE over it |
| Defaults/grants | Review creator's default ACL, PUBLIC/inherited grants, effective privileges; do not widen other tables to pass |
| Data API | Confirm public exposed in actual Data API settings/config, grants and schema cache; SQL settings alone may be absent/overridden |
| History content | Reconcile versions/names and installed SQL through approved migration review; record exact repo digest; mismatch/uncertain = STOP |
| Advisors | Review relevant security/performance results, resolve or document acceptance; unavailable = pending |

Exit 1 = unavailable/error, 2 = machine-detected stop, 0 = machine checks complete **but manual gates still required**. No exit code grants installation authority. Missing history privileges/schema/columns stop rather than imply no migration. No credential or personal row content is embedded in scripts.

## Part A checks and publication

Ran `node --import tsx --test tests/inspection/section-visibility-readiness.test.mjs`: **2/2 PASS** (read-only statement allowlist; executing catalog query on synthetic PGlite, preserving fixture rows and flagging missing history/type/role/name collisions). Scoped ESLint for the two new .mjs files: **PASS, no warnings**; `node --check scripts/inspection/section-visibility-preflight.mjs` and `git diff --check`: PASS. Running the runner without target attestation correctly refused before making a connection (exit 1). This is a negative safety check, not a target readiness PASS.

A published and fetched/verified **`98602dabe5d6dd1414ebb24add5dc9e63a278082`**, tree `5a27eaf333c5e0a39aa9a0eadea22d595acd5e0c`, equal to tested local commit `2760a38`. Local/remote equal, clean tree, before B began. Publication used configured GitHub connector, exact complete-tree comparison, expected-parent non-force update, then fetch/equivalent local commit rebase. No migration file or application source changed. Reused existing installed lockfile dependencies through an untracked node_modules symlink; no install/dependency change. Combined A visibility + preflight suite: **7/7 PASS**, no skips.

## Part B — isolated API preparation and actual limitations

Environment inventory found no `docker`, `podman`, `postgres`, `initdb`, `pg_ctl`, `psql`, `postgrest` or `supabase` in PATH, no standard PostgreSQL install/socket or Docker/Podman socket, and no formerly cached Supabase binary at its previous location. Node v24.19.0 and existing repository dependencies are available. Did not install new system tools, create a hosted project or switch tests to the target database.

Added [runner/fixtures instructions](../../tests/integration/visibility/README.md), [API runner](../../tests/integration/section-visibility-api.mjs), [Compose](../../tests/integration/visibility/compose.yaml) and [fixture](../../tests/integration/visibility/fixture.sql). The runner refuses remote Docker endpoint/context overrides; starts only a new random local project; binds API to loopback and uses a private container network, tmpfs and no host/persistent database volume. Password/JWT secret are generated per run in memory. It loads a fresh synthetic database plus the **unchanged visibility migration only**, never foundation/cover/reset. Expected teardown discards only this run's synthetic rows/resources. No database currently existed here to seed or clean up; none was started.

The fixture uses two synthetic auth.users subjects and real signed HS256 authenticated JWTs, with PostgREST switching from a non-bypass authenticator into non-bypass authenticated/anon roles. It does not use service-role requests. Its auth.uid reads PostgREST request.jwt.claims. This is planned real role/JWT API coverage, not GoTrue registration or target-auth proof. The fixture's portfolios ownership policy and content JSON are deliberately synthetic, not a claim to reproduce the unverified target catalog/content schema. Full target/application integration still needs separate evidence.

The ten planned API groups cover successful empty overrides using the actual application parser; keyed upsert/readback; concurrent separate keys; A/A2 per-portfolio isolation; both users' positive access and cross-owner invisibility; RLS-rejected cross-owner insert/upsert/reassignment; zero-row unauthorized PATCH; anon and direct DELETE rejection; cover/invalid section/value rejection; and unchanged title/template/synthetic content/selection/image order. Assertions require expected SQLSTATEs, not arbitrary HTTP/server failures. **All ten API groups are NOT_RUN**, not ten passed tests.

`node --import tsx tests/integration/section-visibility-api.mjs --check` actually returned **exit 2 / NOT_RUN** because local Docker engine/Compose are unavailable. It did not start containers or make target requests. `--run` has intentionally not been invoked without prerequisites. Image tags PostgreSQL 17.6-alpine/PostgREST v14.18 were not pulled or runtime-verified; official PostgREST v14 auth/config docs informed the role/JWT config. Resolve image digests and confirm versions during the eventual isolated run; no claim these match target PostgREST version.

B also expanded the preflight metadata to report effective role/table privileges and relevant role memberships, rather than relying only on explicit ACL entries. Still no data writes. Full policy semantics, inherited-role effects, migration identity/content and Data API exposure remain operator review gates, not inferred PASS.

### Actual check ledger

| Check executed in this round | Result / scope |
| --- | --- |
| Initial preflight tests | 2/2 PASS, PGlite catalog + read-only source checks |
| A combined visibility/preflight | 7/7 PASS; synthetic PGlite, no hosted calls |
| B combined existing visibility + new inspection/helper suite | 10/10 PASS (5 existing visibility, 2 preflight, 3 runner safety/JWT/static fixture); no skips |
| After importing actual parser and runner-only hardening | Focused runner helper tests 3/3 PASS; no API stack |
| Full-repository `node_modules/.bin/tsc --noEmit --incremental false` | PASS exit 0; strictness/assertions unchanged |
| Scoped ESLint | PASS 0 errors / 0 warnings for changed .mjs files |
| `node --check` for preflight/API runner | PASS (syntax only) |
| Compose parse with installed Python PyYAML | PASS db/api structure; NOT Docker Compose validation/runtime |
| API runner --help / --check | Help works; prerequisites NOT_RUN exit 2 |
| Real local PostgreSQL/PostgREST | NOT_RUN; missing local container/native backend tools |
| Hosted metadata | Inventory identified target; SQL/history timeout; advisor unavailable |
| New browser/PDF/build | NOT_RUN, intentionally unnecessary: no application source/schema change; prior results not relabeled as current |

After the final metadata-privilege additions, focused checks are recorded in closing verification below. No existing assertions were removed, skipped or weakened. The read-only source test ignores quoted privilege-name strings before checking executable SQL keywords; the transaction/statement allowlist and fixture-preservation assertions remain intact.

### Commands actually used

```sh
git clone --single-branch --branch codex/portfolio-next-phase https://github.com/zenecoil0-design/projectfinal.git portfolio-readiness
git status --short --branch
git rev-parse HEAD origin/codex/portfolio-next-phase
git ls-remote origin refs/heads/codex/portfolio-next-phase
command -v docker podman postgres initdb pg_ctl psql postgrest supabase
curl -so /dev/null -w '%{http_code}\n' --max-time 8 https://mcp.supabase.com/mcp
node --import tsx --test tests/inspection/section-visibility-readiness.test.mjs
node --import tsx --test tests/section-visibility.test.ts tests/inspection/section-visibility-readiness.test.mjs
node --import tsx --test tests/section-visibility.test.ts tests/inspection/section-visibility-readiness.test.mjs tests/inspection/section-visibility-runner.test.mjs
node --import tsx --test tests/inspection/section-visibility-runner.test.mjs
node tests/integration/section-visibility-api.mjs --check
node --import tsx tests/integration/section-visibility-api.mjs --help
node --import tsx tests/integration/section-visibility-api.mjs --check
node_modules/.bin/tsc --noEmit --incremental false
node --check scripts/inspection/section-visibility-preflight.mjs
node --check tests/integration/section-visibility-api.mjs
node_modules/.bin/eslint scripts/inspection/section-visibility-preflight.mjs tests/inspection/section-visibility-readiness.test.mjs tests/inspection/section-visibility-runner.test.mjs tests/integration/section-visibility-api.mjs
git diff --check
sha256sum supabase/migrations/20261020084510_section_visibility.sql
```

Also parsed Compose via installed Python `yaml.safe_load`, inspected local standard install/socket paths and read relevant source/docs/test bootstrap. Supabase configured read-only calls were get_project, execute_sql (BEGIN READ ONLY + catalog identity probe), list_migrations and get_advisors(type=security). Performance advisor was not retried after backend hibernation diagnostic; both advisor classes remain pending, not clean. The psql preflight was NOT run on target because this machine has no psql/approved direct connection, and SQL tool connectivity failed. Generated catalog script was executed only inside new PGlite fixture instances, closed in finally.

## Installation proposal runbook — future approval, NOT executed

1. **Hold release/installation now.** Verify independently the intended Portfolio target `dlauefjrcstfcmhafyan` and connection, including project identity/environment owner. Resolve conflicting inventory/backend status without restoring/waking/altering it under this task. Obtain reachable read-only catalog/history/advisors and confirm actual PostgREST/Data API exposure. Do not request/share secrets in reports.
2. Run the preflight using an approved metadata-only connection; review every stop and manual item. Compare portfolios UUID keys/ownership policy semantics, authenticated role/schema/function/table access, PUBLIC/inherited/default grants. If visibility relation or migration version/name already exists, stop and reconcile full structure/history against the exact repository migration; do not CREATE over it, drop, rerun, silently edit history or treat timeout as absence. Review extra restrictive/permissive policies. If history SQL differs, propose a separately reviewed forward migration rather than editing an installed one.
3. On a machine with an isolated local engine, run the commands in the integration README and retain real API results, image/engine versions/digests and synthetic user-role coverage. Repeat against a separately approved staging environment with the actual dependency schema/policies if the synthetic fixture differs. PGlite/mock cannot close this gate. Review advisor findings with an authorized reviewer; do not change unrelated policies to pass.
4. Request **separate explicit approval** for the target and only `supabase/migrations/20261020084510_section_visibility.sql`. Current SHA-256: `3349bd43ab885da45fa86aa1cb6f2332b6dc6413219147e1cd6efbf7a81c9c16`. Confirm source digest and current HEAD again before approval. No application/schema file changed in this round. Do not use a broad pending-migrations push or rerun foundation/cover/reset. Approved migration tooling must record/reconcile the exact migration identity and SQL; if tooling would generate a different version, review/history-map that explicitly first, never silently assume equivalence.
5. **Schema before application deployment.** After approval only, authorized operator installs that additive transaction once using the agreed history-aware method. Verify new columns/PK/FK/check/default/RLS/policies/effective authenticated SELECT/INSERT/UPDATE, no anon/DELETE, and schema exposure/cache. Confirm no unexpected grants from inherited/default privileges. If anything differs, stop deployment. This round contains no apply/deploy command or authorization.
6. After separately approving test accounts/data in the chosen staging/target, use genuine signed user sessions (not service role) for the allow/deny/per-portfolio/per-key tests. Confirm pre-existing title/template/content remain unchanged; use only authorized test portfolios. Check new-app loading/error/retry, missing-table fail-closed behavior, draft baselines and export readiness. Do not create those accounts or write test rows on hosted project under the present authority.
7. Only accept live availability after catalog + real API + authorized application integration are evidenced. Maintain a release hold on failure. If app rollback is necessary, choose a known-compatible version that honors stored visibility and fails closed; a pre-visibility version may expose hidden sections and is not a safe automatic fallback. If none is verified, stop export/release rather than silently reverting to all-on. Preserve the additive table/settings; no DROP/reset/delete rollback. The existing transaction should roll back its own incomplete DDL failure; inspect history/catalog before any retry.

### Unchanged app behavior and concurrency boundaries

No loader/store/form/handler changed. Missing table, permission/API failure or malformed read still shows visibility error/retry and blocks export; forms/draft stay available. Successful empty read defaults to all-on; failure never does. Server-confirmed writes retain last confirmed Preview and single-key intended retry, never markSaved for content. Different-key writes are isolated; same-key multi-tab writes remain last-write-wins and stale-tab UI updates only on reload. Pending backend writes may complete for their original portfolio after navigation; old callbacks cannot enter a new UI lifetime. No new conflict/revision/Autosave framework or live-device/Storage proof is claimed.

## Closing verification and publication

After the final metadata privileges/role-membership and runner hardening changes: focused preflight + runner safety/JWT/static checks **5/5 PASS**, scoped ESLint **0 errors / 0 warnings**, syntax checks and diff check PASS. No application source or migration changed after the full-repository typecheck. No real API scenario was silently substituted by these helper tests. Final staged diff/link and remote verification are supplied below/with the handoff.

Final staged diff check PASS (including all new fixtures/runner files). Relative file-target validation across 5 edited Markdown documents: **87 links, 0 missing**; fragments/external URLs not validated. Git diff against starting HEAD confirms no changes under src/, supabase/, package.json or package-lock.json. No application build/browser/PDF rerun is warranted by these inspection/test/docs-only changes. Visibility implementation status remains PARTIAL, and no hosted database/Storage rows, schema, policies, auth or deployment were changed.

A remote `98602dabe5d6dd1414ebb24add5dc9e63a278082` is verified above. B/final SHA is reported in the handoff only after publication; embedding a commit's own SHA would change that commit. Resolve the final report-containing commit with `git log -1 --format=%H -- docs/verification/SECTION_VISIBILITY_INTEGRATION_READINESS.md`. Final publication must compare the complete tested Git tree, use expected-parent/non-force update, fetch and compare remote/local HEAD and clean working tree. Any newer work/lease mismatch is a stop, not permission to overwrite.

## Current conclusion

**NOT ready to propose hosted installation yet:** current catalog, history, Data API exposure and advisors remain unverified; isolated real PostgreSQL/PostgREST JWT acceptance is still required. Visibility stays PARTIAL, not DONE. The live app must continue showing visibility error/retry and blocking export if the schema/read is unavailable, never assume all-on after failure.
