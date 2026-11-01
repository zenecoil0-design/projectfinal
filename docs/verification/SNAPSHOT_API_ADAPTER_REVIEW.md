# Snapshot RPC adapter — 1 November 2026

Base: `459a448914381e460d5447d6d8ab605a3d6a08bd`.

Added `src/lib/editor/snapshot-api.ts`: explicit read, preparation and acceptance calls. Each verifies the current authenticated owner and lifetime. Reads never prepare or accept implicitly. Acceptance sends the reviewed source fingerprint once and reads back the authoritative section through the existing strict parser. No automatic mutation retry or store mutation is performed. A late response cannot initiate a readback in an expired session. Failed readback is not success and does not prove rollback.

The caller must still guard dirty/busy/export state, provide a fresh lifetime predicate, and apply returned data only to the matching session. This module is not yet imported by live forms. It does not persist pending requests, connect atomic library saves, install RPCs or complete Snapshot.

Validation: 10/10 unit tests passed in one run (five new adapter tests plus five reader tests). Full repository TypeScript and scoped ESLint passed. Diff whitespace check passed. Mock clients only, no hosted writes, no new browser/build claim. Existing application routes are unchanged.

Next required implementation remains atomic library callers and uncertain-upload recovery, then Editor manual acceptance/UI and Preview/PDF validation, real concurrent API acceptance and reviewed migration installation. See [transition/read checkpoint](SNAPSHOT_TRANSITION_READ_REVIEW.md). Autosave and per-portfolio image subsets remain removed.
