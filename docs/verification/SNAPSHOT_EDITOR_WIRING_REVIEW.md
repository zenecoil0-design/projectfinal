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
