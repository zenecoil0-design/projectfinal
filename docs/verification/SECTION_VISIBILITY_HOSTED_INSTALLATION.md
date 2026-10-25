# Section Visibility installation checkpoint — 2026-10-25

Owner explicitly authorized installation. Applied only the unchanged section visibility SQL from repository migration 20261020084510_section_visibility.sql through the migration API. Hosted migration history assigned version 20261025052526, name section_visibility. These refer to the same installation: do not apply the older repository filename again or run all pending migrations blindly.

Post-install catalog verification confirmed the table, enabled RLS, three ownership policies (SELECT/INSERT/UPDATE with UPDATE USING and WITH CHECK), composite primary key, six-section constraint and portfolio cascading foreign key. Authenticated SELECT/INSERT/UPDATE are granted; direct DELETE and anonymous SELECT/INSERT are denied. No content backfill/reset or Storage operation occurred.

The owner subsequently reported A4 Preview renders again. This is user-reported application evidence, not an agent-observed browser test. Toggle persistence, real two-account API checks and exported PDF after installation remain pending. The local real PostgreSQL/PostgREST 10/10 evidence remains separate.

The migration file's original prepared-only comments describe its authoring round; this installation record supersedes its deployment status without modifying the tested SQL. Other pending migrations, including portfolio actions and image limits, were not installed.
