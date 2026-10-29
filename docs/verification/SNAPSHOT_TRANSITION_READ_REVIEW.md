# Snapshot: old-portfolio preparation and read contract — 29 October 2026

Branch: `codex/portfolio-next-phase`. Base: `b8830a0411921cd17e6039459731b8c948ba56ad`.

## Status

Implemented and locally tested the missing transition/read boundary. **Not installed on hosted infrastructure and not wired into the active Editor yet.** The current website continues using its existing readers. This is a tested implementation checkpoint, not completed end-to-end Snapshot acceptance.

## Changes

- `supabase/proposals/snapshot-transition-read.sql` extends the existing foundation proposal. It is deliberately outside the migrations directory; it is not an installation command.
- `prepare_portfolio_item_snapshots` explicitly prepares all three sections in one transaction, including hidden sections. It captures current source content only for rows with no snapshot, null revision and version zero. Repeating preparation preserves accepted editions, versions, source IDs and selection order. An incomplete/corrupt edition is rejected rather than replaced with today's content. A late failure rolls the entire preparation back.
- Preparation verifies the portfolio owner and uses the existing capture transaction. It does not rewrite portfolio title/template/colors/visibility, remove selections, recreate sources or delete images. Existing touch triggers can update the portfolio modification time when new snapshots are captured. It cannot recover historical content that was never stored.
- `read_portfolio_item_snapshots` is a **STABLE, SECURITY INVOKER** read, with explicit owner checks plus existing table RLS. It returns an explicit format-version-one envelope containing portfolio ID, section, ordered accepted data, accepted version/revision and current source fingerprint. It does not capture, refresh, write, or replace stored content.
- A selected row without an edition raises preparation-required (`55000`), instead of appearing empty or falling back to live library content. Invalid editions or inaccessible sources fail closed. An authorized portfolio with a genuinely empty section returns an empty array.
- Source fingerprints use the same canonical JSONB representation as capture (excluding source `updated_at`, retaining ordered image rows). Tests compare the two paths directly. Fingerprints are change detectors, not security tokens or monotonically increasing library revision IDs.
- `src/lib/editor/snapshot-reader.ts` validates the envelope and maps accepted data to the existing three Preview item types. It rejects wrong portfolio/owner/section, unsupported format, missing fields, unsafe versions, duplicate/out-of-order items/images and mismatched image parents. It never queries the live library or writes a store itself.
- Mapping preserves whitespace, zero, all image rows and legacy over-limit certificate images. A legacy certificate single-image URL is used only when the captured image-row array is empty. Broken URLs remain present so the existing export validation can detect them; no silent image filtering, truncation or per-portfolio image subset is introduced.

## Validation performed in this round

- New transition/read PGlite scenarios: **5/5 PASS**, 13.2 seconds. Covers all three categories, preparation-required, hidden sections, stable ordering/IDs, unchanged metadata, repeated preparation after source edits, version-two retention, read-only transactions, explicit refresh, deletion cascade, owner/anonymous isolation, malformed stored state and injected late failure/rollback/recovery.
- New parser tests: **5/5 PASS**. Covers malformed responses and field types, foreign context, image ownership/order, legacy images, whitespace/zero and update markers without changing accepted content.
- Final combined run: **39/39 PASS in one run**, 50.8 seconds; no skips. The ten new tests above are included, not added to this total.
- Full repository TypeScript: PASS after final test additions.
- Scoped ESLint for the new source and test files: PASS, zero errors/warnings.
- Diff whitespace check: PASS.

Final combined command:

```sh
node --import tsx --test --test-concurrency=2 tests/snapshot-foundation.test.ts tests/atomic-library-update.test.ts tests/snapshot-create-copy.test.ts tests/snapshot-upload-validation.test.ts tests/snapshot-transition-read.test.ts tests/snapshot-reader.test.ts tests/inspection/snapshot-reference-inventory.test.mjs tests/library-lifecycle.test.ts tests/selection.test.ts tests/portfolio-actions-db.test.ts tests/manual-age.test.ts
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint src/lib/editor/snapshot-reader.ts tests/snapshot-reader.test.ts tests/snapshot-transition-read.test.ts
```

Dependencies were installed using the existing lockfile (`npm ci --ignore-scripts`); no manifest/lockfile change. The decoder has no active runtime caller yet, so no UI, renderer or build behavior changed and no browser/PDF result is claimed from this round.

## Integration requirements still open

1. Wire atomic library create/update callers and uploaded-file/uncertain-result recovery before revoking old direct writers. Keep files while a result or reference remains uncertain.
2. Wire preparation as an explicit, guarded lifecycle step, then use this reader in the three Editor forms. Do not call the capture RPC as an ordinary read or mutate a dirty session while refreshing. Validate the current owner/portfolio/lifetime before applying asynchronous results to stores. Errors must preserve draft and block incomplete export.
3. Add manual update notices/acceptance and verify accepted data flows through Preview and PDF in all templates. No end-to-end SNP case is marked PASS by these unit/database-model tests.
4. Verify target catalog, effective grants (including PUBLIC/column privileges), image ownership configuration and API exposure before promoting proposals into migrations. Do not re-run old foundation migrations.
5. Run real concurrent PostgreSQL/PostgREST save/capture/prepare/copy/delete acceptance and resolve the existing lock-order risks. These PGlite tests do not prove concurrent-session behavior; no Docker runtime was available here. Preparation uses existing portfolio/relation/source locking and does not claim to close that blocker.
6. Complete snapshot-aware retention/cleanup coordination. This change performs no Storage deletion and does not authorize cleanup.

No hosted SQL, migration installation, deployment, reset, real data deletion or Storage mutation occurred. Autosave and per-portfolio image selection remain **REMOVED**.

Related: [delivery scope](../FINAL_DELIVERY_SCOPE.md), [foundation](SNAPSHOT_FOUNDATION_PROTOTYPE_REVIEW.md), [atomic create/copy](SNAPSHOT_CREATE_COPY_REVIEW.md), [upload validation](SNAPSHOT_UPLOAD_VALIDATION_REVIEW.md).

Documentation checked: local Next.js TypeScript guide, [Supabase changelog](https://supabase.com/changelog), [explicit API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), and [PostgreSQL row locks/deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html). No platform/extension upgrade is part of this checkpoint.
