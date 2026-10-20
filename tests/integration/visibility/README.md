# Isolated Section Visibility API acceptance — NOT RUN in the authoring environment

This is not the Playwright mock server or PGlite. It is a runner for a **real local PostgreSQL 17.6 + PostgREST 14.18** stack. It has not been executed end-to-end here: Docker/Podman, native PostgreSQL/psql/PostgREST and Supabase CLI are absent. Syntax/helper/PGlite checks do not imply these API scenarios pass.

## Requirements and commands

- Existing repository lockfile dependencies (`tsx` for importing the actual visibility parser).
- Local Linux Docker engine via Unix socket and Compose v2. Remote contexts and DOCKER_HOST/DOCKER_CONTEXT overrides are rejected; no cloud-hosted alternative is accepted.
- Approved access to obtain the two explicit container image tags in compose.yaml, enough local RAM for tmpfs, and a free loopback TCP port. Images were not pulled or validated in the authoring environment. Tags pin versions, not immutable image digests; record resolved image digests with the eventual test evidence.
- Do not supply a hosted URL, target API key, service-role key or database connection string. The runner has no option for them and creates its own random Compose project. It does not reuse local Supabase or any existing database.

```sh
node --import tsx tests/integration/section-visibility-api.mjs --help
node --import tsx tests/integration/section-visibility-api.mjs --check
node --import tsx tests/integration/section-visibility-api.mjs --run
```

`--check` never starts containers. Exit 2 means prerequisites unavailable/refused; it is NOT_RUN, not a failed RLS assertion. `--run` creates a fresh project/database, loads fixture.sql, then **only** the unchanged `20261020084510_section_visibility.sql`, starts PostgREST and makes actual HTTP calls. No foundation/cover/reset script is invoked. Database name and empty-schema guards fail rather than overwrite. Credentials are random, local, in-memory and not logged. Authenticator is NOSUPERUSER/NOBYPASSRLS/NOINHERIT; request JWTs select authenticated with two distinct synthetic auth.users subjects. Anonymous requests omit the token. No service role is used for HTTP assertions. Administrative SQL is confined to fixture/migration bootstrap, not used to claim permissions pass.

The runner starts and cleans up exactly its own random Compose project. PostgreSQL has no published port or persistent/host volume; API binds 127.0.0.1 and the container network is internal. All synthetic rows are discarded by `down` at the end; no real user data is involved. If setup/assertions/cleanup fail, overall exit is nonzero. Errors are sanitized to avoid logging generated connection passwords. For diagnosis inspect only that printed project locally and redact credentials; do not publish raw docker inspect/config or JWT output. Interrupt/kill/power loss can prevent finally cleanup; identify the printed project name and stop only that project manually, never run global Docker prune.

## API assertions planned (ten groups)

1. Successful empty override read uses the actual application parser and returns all-on defaults.
2. A writes one section, receives representation and reads it back.
3. Concurrent different-key writes and later one-key overwrite preserve all other keys.
4. Two portfolios owned by A remain independent.
5. B writes/reads B, A and B cannot see each other's rows.
6. Cross-owner insert and conflict upsert reject with SQLSTATE 42501, in both directions.
7. Cross-owner PATCH returns zero rows (normal RLS behavior), reassignment of own row to B rejects; B's value unchanged.
8. Anonymous SELECT/POST and authenticated DELETE reject with 42501; permitted data unchanged.
9. cover/unknown/empty sections, null and malformed boolean reject with expected constraint/input SQLSTATEs. PostgreSQL's accepted boolean encodings are not redefined by this test.
10. Full synthetic portfolio title/template/content/selection/image-order snapshot remains equal after writes/denials.

HTTP success responses are not accepted as denials, and arbitrary connectivity/server errors are not accepted as permission denials. Positive reads/writes of both users establish that authenticated JWTs actually work before negative checks. Retry starts a new empty stack, not a reset of an existing project.

Fixture ownership policy/auth.uid emulate the dependency contract and use actual PostgREST `request.jwt.claims`, not the PGlite single-setting test stub. They are **not a dump of hosted portfolios policies or Supabase Auth**. Passing this suite would establish isolated PG/PostgREST behavior for that fixture, not target identity, GoTrue login, hosted Data API settings or full application integration. Current target catalog and later authorized staging/user-session checks remain separate gates.

See [readiness and installation approval runbook](../../../docs/verification/SECTION_VISIBILITY_INTEGRATION_READINESS.md).
