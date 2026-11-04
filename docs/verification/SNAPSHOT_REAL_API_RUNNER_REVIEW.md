# Snapshot API runner — 3 November 2026

## Owner-run acceptance — 5 November 2026

At `6484b3560394fa2a027d1f80ac13b795c4fdf5fb`, the owner ran both suites in Ubuntu/WSL using Docker Engine 29.9.2 and Compose 5.6.1 and supplied the complete console results:

- Generated migration consistency check: PASS.
- Snapshot release migration through real PostgreSQL/PostgREST: **24/24 PASS in one run, exit 0**. The runner applied eight setup steps, including the generated release migration. Includes owner isolation, concurrent acceptance/row-lock races, rollback, retained editions/copies and deletion semantics.
- Real Storage HTTP and physical file-byte checks: **7/7 PASS in a separate run, exit 0**. Includes fresh upload/read, owner/anon restrictions, denied overwrite/upsert/move, delete leaving the original readable, and new-file upload retaining the old bytes.

These are two separate suites, not a single 31-case run. Evidence was executed on the owner's machine and reported in chat, not rerun in the assistant environment. No hosted migration, live Auth, hosted Storage or full browser integration is established by these results.

A remaining pre-enable compatibility issue was found in source review: library forms accept WEBP and CropInput's “use original” preserves that file, while the Snapshot atomic uploader and upload-reference SQL currently accept only JPG/PNG. Correct and test that mismatch before approving cutover; do not treat the PNG Storage PASS as WEBP coverage.


**Earlier checkpoint status: owner-run local PostgreSQL/PostgREST API acceptance PASS, 24/24,
exit 0, on `a9b3ee0bf13d3bd84496c52d124bddc94dea1f87` (3 November 2026).
Hosted installation/integration remains pending. Earlier checkpoint results below
are retained as history and are superseded only for this local API run.**

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


## Owner-run corrected API acceptance — PASS

The owner supplied the complete terminal output from Ubuntu/WSL at checkout
`a9b3ee0bf13d3bd84496c52d124bddc94dea1f87`:

- Docker Compose 5.6.1; Engine 29.9.2.
- Runner project: `snapshot-integration-6a4dfb7130d0`.
- All 13 isolated fixture/proposal setup steps completed.
- All 24 named API cases passed in one run, including the previously failing
  education acceptance case and all three observed source-write/capture races.
- Final JSON: `result: PASS`, `cases: 24`.
- Shell exit status: 0; no cleanup failure was reported.

This is execution evidence supplied by the owner, not a run on the agent host.
The tested stack uses the pinned PostgreSQL 17.6/PostgREST 14.18 Compose images,
synthetic data, signed authenticated JWTs and real HTTP/SQL requests. It is not a
mock API or a PGlite replacement. The correction to PT409 is now verified through
PostgREST, including the HTTP 409 assertions and unchanged edition on conflict.

The pass covers the defined preparation, ownership, replay, source updates,
acceptance, rollback, copy, upload-reference metadata, selection and deletion cases.
It does not establish hosted schema compatibility, Supabase Auth/Storage service
behavior, physical file retention, all possible concurrency schedules, or full
browser-to-hosted acceptance. No hosted installation or flag activation follows
automatically. Next: inspect target catalog/history/grants and active writers,
prepare reviewed migration/install steps, then obtain installation authorization
and verify the real application before enabling Snapshot.

This evidence-recording checkpoint changes documentation only; no application,
SQL, dependencies or test assertions changed, so no build/test rerun was needed.
