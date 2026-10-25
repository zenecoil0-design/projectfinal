# Section Visibility local acceptance

## Operator evidence

On 2026-10-25 (Asia/Bangkok), the owner supplied terminal output reporting PASS for all 10 groups in one run. Base: b37066774b8cd1f7c1e328d2dd9dd7c0b0ef1203, plus the exact Compose network change included here. This is operator-provided evidence, not an agent-executed Docker test.

Environment: WSL Ubuntu, Node 24.22.1, npm 11.19.1, Docker Engine 29.9.2, Compose 5.6.1.
Command: node --import tsx tests/integration/section-visibility-api.mjs --run
Final result: PASS, cases: 10.

Positive read/write, independent section/portfolio values, two-owner RLS, anonymous/direct-delete denials, invalid values and unchanged synthetic portfolio data passed. Real PostgreSQL/PostgREST and synthetic signed JWTs were used. No cleanup error was reported.

## Fix and verification

Earlier attempts stopped before assertions with ECONNREFUSED. Operator logs confirmed healthy PostgreSQL and listening PostgREST with schema loaded, but no published host port. API was connected only to an internal network. Added an API-only bridge while retaining internal database networking, localhost API binding, no published database port, temporary database storage and scoped cleanup. API bridge egress is not isolated.

Agent ran the three existing runner helper/security tests successfully and git diff --check before the shell environment became unavailable. Published configuration was reconstructed from the remote base with the same two substitutions used by the owner. No application code or migration SQL changed; no new build/PDF run was needed or claimed.

## Deployment boundary

Migration: supabase/migrations/20261020084510_section_visibility.sql
SHA-256: 3349bd43ab885da45fa86aa1cb6f2332b6dc6413219147e1cd6efbf7a81c9c16

Only isolated API acceptance is closed. Hosted Auth, Data API exposure and browser integration remain unverified. Historical reports retain historical results. This commit applies no hosted migration.

Proposal after current target checks and explicit owner approval: apply ONLY this visibility migration, never all pending migrations or reset/foundation scripts. It adds a table with ownership RLS, authenticated SELECT/INSERT/UPDATE, no direct DELETE, six allowed sections and portfolio cascade. It does not backfill content or touch Storage.

After application verify catalog/history/grants/policies, authenticated page loading and toggle persistence, cover visibility, A4/TOC/numbering and PDF. Retry failed visibility loading without discarding content drafts. Do not hide failures with all-visible defaults. Keep hosted acceptance pending until observed.
