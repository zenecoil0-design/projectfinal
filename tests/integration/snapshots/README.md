# Snapshot API acceptance — local Docker only

From a current checkout of `codex/portfolio-next-phase`, in Ubuntu/WSL with Docker
Desktop running and working Docker integration:

```bash
node tests/integration/snapshot-api.mjs --check
node tests/integration/snapshot-api.mjs --run
```

No npm installation, .env, Supabase credentials or feature flag change is required.
`--check` is prerequisites only. Successful `--run` prints 24 named PASS lines,
then JSON with `result: "PASS"` and `cases: 24`. Record `git rev-parse HEAD` with
that result. A failure stops the run with a nonzero exit, still attempts cleanup,
and does not authorize installation or enablement. Startup prints numbered setup
steps without SQL, passwords or tokens, so its last phase helps identify failures.

If image download times out, pull the pinned images and retry the whole isolated run:

```bash
docker pull postgres:17.6-alpine
docker pull postgrest/postgrest:v14.18
```

The runner accepts no target URL or connection argument, refuses Docker endpoint/
context overrides and non-Unix endpoints, and creates its own random project.
It reuses the visibility Compose network/localhost port mapping and tmpfs database.
No existing database is reused. Credentials are random; API calls use two synthetic
signed authenticated JWTs, not administrator credentials. Setup and controlled
failure/lock injection use admin SQL only inside that new local database. Cleanup
is limited to its own project; if it fails, stop only the named project, never run
global prune or delete other volumes.

## What is covered

- Explicit initial preparation, replay and read-only behavior; no implicit capture.
- Two owners/anon permissions; direct source/image/snapshot/receipt write denial.
- All three sections: concurrent create replay, changed-intent rejection, source
  edits retaining old snapshots, concurrent explicit acceptance, rollback on late
  tag failure, and a source-update/capture race.
- Copy preserves accepted editions, image order, colors, hidden section and age.
- Upload-reference validation uses synthetic Storage metadata and an invalid domain.
- Selection changes are portfolio-local; library deletion removes snapshot refs
  including hidden copies, preserves shared tags, and cannot be undone by stale saves.
- Portfolio deletion keeps library; replayed creates do not resurrect deleted items.

For the three capture races, a test-only advisory gate blocks UPDATE after source
row locking. The runner observes that wait and a subsequent capture lock wait before
releasing the writer. Stale expected revision must fail, then fresh explicit acceptance
must contain the new text/images together. Polling checks conditions; no fixed delay
is used as evidence that a lock was acquired. All possible concurrent delete/copy/
prepare schedules are not covered and are not claimed deadlock-free.

Fixture checks (PGlite, not API/concurrency acceptance) run separately:

```bash
node --import tsx --test tests/integration/snapshots/fixture.test.ts tests/integration/snapshots/runner.test.mjs
```

The fixture is synthetic, not a live schema dump. A real API PASS does not establish
hosted schema compatibility, Supabase Auth, Storage service behavior or physical
file retention. Proposals remain outside migrations and are not installed by this
runner on any hosted target. Keep the Snapshot flag off pending reviewed installation.

Stale reviewed revisions now return **PT409 / HTTP 409**, not the transient
serialization code 40001. PostgREST 14 may endlessly retry custom 40001 errors;
the owner-run suite on 418fd43 stopped at that path. Update the checkout before
rerunning. No increase to the 15-second request timeout is required by this fix.
