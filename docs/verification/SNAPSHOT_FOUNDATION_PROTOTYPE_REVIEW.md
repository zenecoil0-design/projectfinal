# Snapshot foundation prototype — 28 October 2026

Base: 78f10de39982cdb4d05c5dfb2446e8a0391456cc. Branch: codex/portfolio-next-phase.

## Delivered locally tested contract

`supabase/proposals/portfolio-item-snapshots.sql` is a **local prototype, not an installable migration**. It is outside the migrations directory intentionally. No hosted schema or application reader changed.

- Add snapshot payload, content fingerprint and accepted-version counter to each of the three existing selection tables. Existing source/portfolio foreign keys retain cascade behavior.
- Change selection replacement to remove only deselected rows and upsert sort_order. Existing rows retain their snapshots; new rows are captured within the selection RPC transaction.
- Capture text and ordered image rows with one SQL statement. Education logo and legacy certificate URL remain in the source payload. Do not accept a client-provided snapshot body.
- Explicit refresh requires the current source fingerprint. Repeating acceptance of identical content does not increment the accepted-version counter again. Fingerprint (MD5 of canonical JSONB) is an optimistic change detector, not an authentication secret or a monotonic library revision number.
- Portfolio ownership and library ownership are checked inside the RPC. PUBLIC/anon execution is revoked. Direct relation mutations by authenticated/anon are revoked in the prototype; selection writes use the existing ownership-checked RPC.
- Source deletion cascades into every selection/snapshot, including other portfolios. Removing a selection leaves its library source intact.

## Evidence

PGlite tests: 3/3 PASS, one per section, then expanded tests 3/3 PASS in 8.2 seconds. These are two runs of three tests, not six distinct cases. Assertions cover source text/image changes while another portfolio retains its original snapshot, ordered images, capture/read, reorder preservation, expected-revision rejection, successful refresh, refresh replay, cross-owner access rejection, failed-selection rollback, direct snapshot tampering rejection, deselection retaining library data, and source deletion cascading to two portfolios.

Scoped ESLint PASS; full-repository TypeScript PASS; git diff --check PASS. No build or browser run: application source is unchanged and no UI feature is enabled by this proposal.

## Must complete before turning this into a migration

1. Library saves currently commit primary text and image mutations through multiple requests. A single-statement capture is internally consistent at a database snapshot, but can still capture an intermediate state of that multi-request user operation. Coordinate atomic library content/image writes and capture; do not claim logical save atomicity from these tests.
2. Update the duplicate-portfolio RPC to copy the original snapshot payload/version instead of selecting live library content. Existing duplicate RPC is not changed here.
3. Add an explicit old-portfolio transition/backfill with catalog/grant checks and no invented historical data. Snapshot JSON currently reflects source rows; finalize the versioned payload schema and reader mapping before integration.
4. Connect Editor readers, update notices, manual acceptance, dirty/session guards and PDF. Current UI still reads the shared library until that integration lands.
5. Inventory all grants/roles and policies on target before promotion; revoke column-level/PUBLIC mutation grants too if present. Test real PostgreSQL/PostgREST roles, concurrent source deletion/writes, deadlock/retry and ownership isolation. PGlite is not that acceptance.
6. Add stored snapshot references to Storage reconciliation before any cleanup. Old image URLs retained by snapshots must remain usable.

No deployment, migration installation, reset, real data deletion or Storage removal. Full snapshot feature remains IN_PROGRESS, not DONE. No Autosave or per-portfolio image subsets are introduced.
