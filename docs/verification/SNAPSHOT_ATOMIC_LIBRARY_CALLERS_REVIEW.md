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

## Image, account and PDF follow-up — 2026-11-02

Added production-browser coverage for cropped-image uploads in all three libraries.
The tests compare the confirmed form image bytes with the upload body, require
one upload across a failed create/manual retry/edit, retain the original stored
image ID/URL (or education logo) on text-only edit, and observe no Storage DELETE.
Separate held-upload cases switch accounts before completion, then check the new
owner's draft survives and no old REST mutation starts after the upload completes.
These fixtures contain one image per item; they do not establish multi-image order
or physical Storage retention on a hosted service.

The education acceptance/reconciliation scenario now exports with the real PDF
renderer at 390px while Preview is hidden. The downloaded file had 7 pages,
matching Preview, 569,049 bytes; pdfinfo reported A4 (595.28 x 841.89 pt).
This verifies export/download/page count and reported page size, not a visual
inspection of every PDF page or all three templates. Snapshot RPC data is mocked.

Validation in this follow-up:
- Enabled production build passed. No application source changed in this round.
- Full-repository TypeScript and scoped test ESLint passed; diff check passed.
- Combined browser run passed 9/9 (18.4s).
- Subsequently strengthened retained-image comparison to capture the pre-edit
  server image IDs/URLs; the three affected tests passed 3/3 (8.6s), and TypeScript
  and scoped lint passed again. The remaining six tests were unchanged.
- Earlier attempts exposed a test reading the crop dialog before canvas completion;
  tests now wait for that dialog to disappear and read the main form image.
  A later run passed 8/9: PDF locator could not find the button because the color/
  download accordion was closed. Opening the real accordion fixed the test; the
  focused PDF case passed before the combined 9/9 run. No assertions were dropped.

This closes the focused image/account/export regression checkpoint only. Real
PostgreSQL/PostgREST acceptance, concurrency, reviewed migration packaging,
installation and hosted integration remain required. No hosted database or Storage
was changed. The Snapshot flag remains disabled by default.
