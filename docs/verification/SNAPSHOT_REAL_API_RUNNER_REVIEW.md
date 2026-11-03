# Snapshot API runner — 3 November 2026

Base: `a30dbc9490a3da56c868208d37b636ab813c728c`, branch
`codex/portfolio-next-phase`. This checkpoint delivers a local acceptance runner,
not a real API PASS or approval to install/enable Snapshot.

## Delivered

`tests/integration/snapshot-api.mjs` and `snapshots/` add 24 named cases using the
existing PostgreSQL 17.6/PostgREST 14.18 Compose stack. One shared setup list applies
the existing actions fixture, a synthetic library extension, existing visibility/
actions/age/image-limit migrations and all six Snapshot proposals to a fresh,
randomly named local database only. Existing application source, proposals,
migrations, dependencies and the default-off feature flag remain unchanged.

Coverage includes prepare/read semantics, two-owner/anon checks, revoked direct
writes, create replay, source edits, retained snapshots, per-item acceptance, copy,
late rollback, new-upload references, selection order/removal and deletion cascade.
Three deterministic source-write/capture races observe actual PostgreSQL lock waits
before releasing an advisory barrier. Read [runner instructions and limitations](../../tests/integration/snapshots/README.md).

## Verification and continuity

The earlier unpushed workspace was removed before publication. Files were recreated
in a fresh worktree from the actual remote base above; results from that lost working
tree are not used as validation of these recreated files. GitHub's published app
checkpoint was preserved. The recreated runner accepts both 200 and 204 for the
void selection RPC, without relaxing its database-content assertions.

Final results on this checkpoint:
- Combined fixture/runner/adapter/transition suite: 13/13 passed, no skips.
- Full-repository TypeScript: passed. Scoped ESLint: passed. Diff check: passed.
- Syntax check of the runner passed.
- `node tests/integration/snapshot-api.mjs --check`: exit 2 / NOT_RUN because Docker
  is unavailable in this execution environment.
- PostgreSQL/PostgREST 24-case API run: **NOT_RUN**, not replaced by PGlite evidence.
- No application source change, so no new build/browser/PDF run was required.

Combined command:

```bash
node --import tsx --test tests/integration/snapshots/fixture.test.ts tests/integration/snapshots/runner.test.mjs tests/snapshot-api-database.test.ts tests/snapshot-transition-read.test.ts
```

## Next gate

Run the new API suite in the owner's working local Docker/Ubuntu environment,
retain final output and checkout SHA, diagnose failures before migration promotion.
Even after API PASS, target catalog/history/grants/policies and every active writer
must be reconciled before reviewed installation. The fixture does not validate
Supabase Auth, physical Storage retention or every competing delete/copy ordering.
No hosted database/Storage writes, deployment, reset, file deletion or main merge
occurred. No Snapshot acceptance case is declared complete solely from this runner.

## Owner-run API failure and stale-revision fix — 3 November 2026

The owner ran commit `418fd430e76aee0f63284aa6a0ba05a2f844796e` on Docker
Engine 29.9.2 / Compose 5.6.1. All 13 setup steps and the first 11 API cases
passed; case 12 (education acceptance) failed, exit 1. The owner's diagnostic
rerun likewise stopped before a capture HTTP response or assertion failure was
logged. This is user-provided execution evidence, not a run on the agent host.
The API suite is now ATTEMPTED/FAILED at that commit, superseding NOT_RUN above.

Source inspection found that stale reviewed revisions deliberately raised 40001.
That is a business conflict which cannot be fixed by replaying the same request.
Supabase documents that custom 40001 errors can cause endless PostgREST 14
transaction retries, consistent with the observed absence of an HTTP response.
The diagnostics did not capture the transport exception type, so an actual timeout
is inferred, not independently recorded. This SQL defect is fixed regardless:
use PT409 (HTTP 409), keeping the stale-revision guard and all rollback semantics.
No timeout increase, retry loop, assertion deletion or PostgREST image change.

Sources:
- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions
- https://docs.postgrest.org/en/v14/references/errors.html

Local verification of the correction:
- Combined fixture/runner/adapter/foundation/transition tests: 16/16 passed (31.6s).
- Added safe failure-category reporting afterwards; focused runner tests: 3/3 passed.
  Two overlap the combined run; do not describe these as 19 unique cases.
- Each of the three fixture sections rejects the old revision with PT409, retains
  its previous edition unchanged, accepts the latest explicitly, and keeps version
  2 on replay. API cases now require both PT409 and HTTP 409.
- Full-repository TypeScript, scoped ESLint and diff check passed.
- No application source/build change, no hosted installation or migration edits.
  Only the uninstalled SQL proposal changes server behavior in the isolated runner.

The real 24-case API suite must be rerun on the corrected commit. Do not mark it
passed from these PGlite tests. Ordinary --run now reports a safe failure category
(e.g. TimeoutError versus AssertionError) without messages, payloads or credentials.
