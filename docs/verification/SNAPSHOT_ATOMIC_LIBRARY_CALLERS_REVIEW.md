# Atomic library callers — 2026-11-02

The Snapshot flag now selects the atomic create/update path in all three actual
Library components. Uploads precede a single RPC containing fields, all retained
image IDs/URLs in order, new URLs and tag IDs. Education sends its logo in fields.
The enabled path does not write primary, image or tag-link tables separately.

An immediate component lock prevents duplicate submission. The current form keeps
one item UUID and immutable request intent across manual retries; successfully
uploaded URLs are reused. Changing the intent after a failed attempt is blocked
until the user checks the library and closes/reopens the form. Owner verification
runs before uploads and before mutation, with lifetime checks after awaits. No
Storage files are removed. Successful updates validate returned ID/owner/fields;
creates require the confirmed receipt shape. Failure keeps the form and warns
that success is not yet confirmed, rather than asserting rollback.

Limitations: this intent is in memory, not a persistent recovery queue. Closing or
reloading loses it; creating again may create a duplicate. Update retry is a manual
replay and is not revision conflict protection. Upload completion is not atomic
with PostgreSQL; uncertain uploads can leave retained files. These limitations
must be included in release acceptance, not hidden by the flag.

Validation on final source:
- Enabled production build passed once; full-repository TypeScript passed.
- Scoped lint: zero errors, six pre-existing img warnings. Diff check passed.
- Unit/PGlite focused suite: 21/21 passed in one run, including create/update,
  ownership, URL validation, snapshot preservation and copy contracts.
- Enabled production browser: 6/6 passed in one run (29.6s): create failure/retry
  with stable payload, edit and no direct table writes for all three libraries,
  plus existing Snapshot preparation/update/read-only recovery tests.
- Browser data/RPCs are mocks; SQL tests are PGlite, not hosted/PostgREST evidence.

No hosted mutation, migration, storage deletion or deployment. Default flag stays
off. Comprehensive image/session/browser/PDF regression, real PostgreSQL/API
concurrency/permissions checks, migration packaging and live acceptance remain.
