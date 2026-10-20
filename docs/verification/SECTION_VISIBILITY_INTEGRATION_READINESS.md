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

Actual published A commit will be recorded in B after publication/fetch verification. Part B must not begin until that check succeeds. No migration file or application source changed. Reused existing installed lockfile dependencies through an untracked node_modules symlink; no install/dependency change.

## Current conclusion

**NOT ready to propose hosted installation yet:** current catalog, history, Data API exposure and advisors remain unverified; isolated real PostgreSQL/PostgREST JWT acceptance is still required. Visibility stays PARTIAL, not DONE. The live app must continue showing visibility error/retry and blocking export if the schema/read is unavailable, never assume all-on after failure.
