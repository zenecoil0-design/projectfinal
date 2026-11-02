# Snapshot Editor wiring — 2026-11-02

Added opt-in loading and post-save authoritative snapshot readback in all three
selection forms. Default remains disabled through
NEXT_PUBLIC_PORTFOLIO_SNAPSHOTS_ENABLED (only literal true enables it).
Do not enable in a deployed app yet: SQL proposals, atomic library writers,
explicit preparation UI, per-item update controls and enabled-mode browser
acceptance remain unfinished. Existing portfolios are not silently prepared.

When enabled, a failed snapshot read fails section loading. After selection save,
readback must match requested IDs and order before updating the store and saved
baseline. A readback failure does not imply rollback and does not replay mutation.

Validation: production build passed; full TypeScript passed; scoped lint no errors,
three existing img warnings. Snapshot reader/API/PGlite tests 16/16 passed.
Default-mode browser regression for metadata retry, order, dirty baseline and
save payload passed 3/3 (one per section). This is not enabled-mode browser
acceptance, hosted API testing or proof the complete Snapshot feature is ready.

## Explicit per-item update UI — 2026-11-02

Three forms now retain the loaded snapshot metadata and show a per-item update
button for confirmed newer fingerprints. A native confirmation precedes mutation.
Drafts are checked synchronously against store baselines as well as disabled UI.
A session-wide busy lock shares existing export/form disabling and synchronous
export guards; unmount invalidates the result and releases the owned lock.

An uncertain response leaves the old draft intact, marks section readiness failed,
and exposes read-only reconciliation outside the disabled content fieldset. It
never automatically replays capture. Successful authoritative readback updates
section data and its baseline. A changed draft while waiting rejects application.

Final enabled-mode production build and full typecheck passed. Scoped lint: no
errors, three existing img warnings. Reader/API/PGlite suite passed 16/16. Enabled
production browser tests cover all three sections: old edition, dirty blocking,
explicit acceptance, failed readback and read-only recovery without repeat capture.
The initial browser run passed 3/3; final run after lifecycle/synchronous-dirty
hardening is recorded separately. Three builds were needed after source changes.

Still disabled by default. Preparation UI, atomic library writer integration,
full enabled-mode async/PDF regression, hosted installation and API acceptance
remain outstanding. This report does not authorize enabling the flag on hosted
accounts or claim complete Snapshot delivery. No hosted data or SQL was changed.

Final enabled production browser rerun: 3/3 passed in 4.5 seconds, on the final
application source, using localhost mock responses (not hosted PostgREST).

## Existing portfolio preparation gate — 2026-11-02

With the feature flag enabled, the verified owner/portfolio first receives three
read-only snapshot checks before forms mount. Only SQL code 55000 identifies a
missing initial snapshot. Corrupt data, permission failures, missing RPCs and
mixed missing/error results show read-only recovery, never a preparation prompt.

The explicit preparation button explains that missing snapshots use current
library contents, not historical reconstruction, and existing snapshots remain.
The preparation RPC runs once per click with an immediate lock. A failed response
shows read-only checking, and successful checking opens the Editor. No implicit
capture during ordinary reads, no refresh of existing editions, no hosted writes.
The keyed lifetime discards responses after changing portfolio/owner/unmount.

Validation this round: enabled production build passed once; full TypeScript,
scoped ESLint (zero errors/warnings) and diff check passed. Unit/reader/API/PGlite
suite passed 22/22. Enabled browser initially 1 passed/2 failed because generic
alert selectors also matched the Next route announcer; scoped selectors to main,
then all 3 passed in one run (4.5s), without source/assertion changes. Scenarios
include missing preparation, mixed backend error (no write offered), lost response
after preparation, read-only reconciliation without replay, already-prepared
entry, dirty blocking and per-item acceptance/recovery in all three sections.

Feature remains disabled by default. Atomic library callers, comprehensive
async/PDF regression and real API/hosted installation are still outstanding.

Follow-up: [atomic callers and image/account/PDF validation](SNAPSHOT_ATOMIC_LIBRARY_CALLERS_REVIEW.md)
now covers the connected library writers and a real mobile-hidden-Preview export
after explicit acceptance/read-only reconciliation. Earlier results above remain
historical; this does not establish hosted availability or complete SNP acceptance.
