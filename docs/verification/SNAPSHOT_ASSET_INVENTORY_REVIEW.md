# Snapshot asset inventory — 29 October 2026

Base: 65df5226efc97228d9c21422e4536aa42bffd976.

Added a read-only aggregate companion to the existing eight-location Storage inventory. It counts snapshot logo URLs, legacy certificate URLs and ordered image-array references across all three relation tables, including copies and hidden sections. Repeated references are counted separately; this is not an orphan count.

Missing columns/tables fail rather than imply zero references. Null or malformed snapshots and image entries report INCOMPLETE_SNAPSHOT_DATA. Roles without unrestricted row visibility report INCOMPLETE_RLS_VISIBILITY. Results contain counts/status only and always return deletion_authorized=false.

The interrupted first attempt failed because a CTE used the reserved word references. The temporary checkout subsequently disappeared; restored the published base into a separate worktree and rebuilt this inspection without that identifier. No previous working files were reset or deleted by this task.

Verification: combined snapshot/reference inventory tests 4/4 PASS; scoped ESLint PASS. Synthetic PGlite only, no hosted query or data/Storage mutation. No application source changes; no browser/build rerun.

Snapshot remains incomplete. This inspection does not validate upload ownership, guarantee file retention, coordinate cleanup races, install proposals, or connect Editor/PDF. Those remain required before activation. Never subtract these counts from object counts to derive safe deletions.
