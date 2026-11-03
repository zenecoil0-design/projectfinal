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
