# Isolated real Storage acceptance

Status: owner-run real HTTP/file-byte acceptance PASS 7/7, exit 0, at
`6484b3560394fa2a027d1f80ac13b795c4fdf5fb` on 5 November 2026.
The author environment still has no Docker.
Do not report 7/7 acceptance from the runner guard tests.

Prerequisites: local Linux/WSL Docker engine and Compose, Node supporting fetch.
No npm packages are needed by this runner. Docker pulls PostgreSQL 17.6-alpine and
Supabase Storage API v1.81.0. Allow time for the first image pull.

```bash
node tests/integration/storage-api.mjs --check
node tests/integration/storage-api.mjs --run
echo "Exit code: $?"
```

A successful run prints seven PASS lines and a final result PASS with cases:7,
then exits 0. A timeout, assertion failure or missing runtime is not acceptance.
The runner generates two signed synthetic user JWTs in memory; permission checks
never use a service-role token. There is no hosted endpoint argument. Remote
Docker overrides are rejected. API binds only 127.0.0.1. Database and physical
files are in per-container tmpfs, with a new random Compose project each run.
Cleanup stops only that project; it never prunes shared Docker resources.

The actual Storage service initializes its own schema/roles. A fresh database
fixture then creates a public test bucket and owner-path policies, followed by
the exact retention proposal. Tests send real HTTP and compare SHA-256 of bytes
read back. Coverage: new upload/read, two owners, anon upload denial, PUT/upsert
denial, owner/foreign delete retaining the file, denied move, and a new uploaded
version coexisting with the unchanged old file. A delete returning 200 must return
an empty result and leave the exact original bytes accessible.

This tests Storage retention independently of Snapshot RPCs. It does not install
the whole app schema or prove hosted Auth, hosted Storage versions, CDN behavior,
external URLs, admin/BYPASSRLS retention, or physical cleanup. Run the separate
Snapshot API suite against the release migration too:

```bash
node scripts/build/snapshot-migration.mjs --check
node tests/integration/snapshot-api.mjs --run
echo "Exit code: $?"
```

Do not open the Snapshot flag or apply hosted SQL on the strength of a local PASS
alone; follow [release runbook](../../../docs/SNAPSHOT_RELEASE_RUNBOOK.md).
If a run fails, share the phase, PASS/FAIL names and sanitized scalar diagnostic;
do not share docker inspect output, credentials, JWTs, or raw service logs.

## Local checks performed

- Runner remote-target/argument/import guards: 3/3 PASS.
- Scoped ESLint, JavaScript syntax and YAML parsing: PASS.
- Owner-run real Docker/Storage: 7/7 PASS in one run, exit 0, Engine 29.9.2 / Compose 5.6.1.
- No hosted test or WEBP/application-upload acceptance is claimed.

## Configuration sources

- https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml (Storage v1.81.0 reference)
- https://github.com/supabase/storage/blob/v1.81.0/.env.sample
- https://github.com/supabase/storage/blob/v1.81.0/migrations/tenant/0002-storage-schema.sql
- https://supabase.com/docs/guides/self-hosting/docker

The committed Compose file pins image versions and disables image transforms,
lifecycle and Storage object versioning. Snapshot editions remain an app concept,
not a dependency on Storage's versioning feature. Fixture data is synthetic.
