# Portfolio actions API acceptance

Run from the repository root in Ubuntu/WSL with Docker Desktop running:

```bash
node tests/integration/portfolio-actions-api.mjs --check
node tests/integration/portfolio-actions-api.mjs --run
```

Uses Node built-ins only; no npm install required for this runner. Reuses the pinned PostgreSQL/PostgREST images and fixed networking from the visibility suite. Creates a random disposable Compose project with a fresh tmpfs database, synthetic users, short-lived signed JWTs and random credentials. Accepts no hosted URL or credentials. Rejects remote Docker overrides. Cleanup only stops its own random project.

Eight API groups cover concurrent replay, copied content/template/palette, ordered shared references/visibility, changed-key arguments, ownership, anon/direct receipt writes, rollback/retry and delete replay/cascade without deleting library items. No Storage files are created or deleted. Synthetic fixture is deliberately smaller than the hosted schema; passing does not prove hosted grants, Auth sessions, triggers or Storage policies.

Current author environment: real Docker suite NOT_RUN (no Docker). Fixture + migrations and existing actions tests pass in PGlite; that is not real PostgreSQL/PostgREST evidence. Do not install the hosted actions migration or enable the Dashboard flag from this preparation result alone.
