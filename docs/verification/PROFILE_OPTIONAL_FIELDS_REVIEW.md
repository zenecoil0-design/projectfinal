# Profile optional fields — verification

## Scope and commits

- Repository: `zenecoil0-design/projectfinal`; branch: `codex/portfolio-next-phase`.
- Starting local/remote HEAD: `e256307d7ce11b3f5326db94dae7740d34dd0d0d`; working tree was clean. Older archived worktrees were preserved.
- Part A published and verified before B: `08fa4e3e193860491eeec4e62bb1bfdc2bb39929` (tree `973700b3d1a443e787eb9ea441bf8c3fcd231657`).
- Part B is the commit containing this report and the expanded `tests/e2e/profile-optional.spec.ts`; its actual published SHA and final local/remote comparison are recorded in the delivery message. Application source is unchanged after A.

## Behavior and preservation

`ProfilePreview.tsx` previously always rendered contact/additional groups and optional scalar rows. Social entries were rendered whenever the array was nonempty, including the default Facebook entry with no link; custom rows always included a colon.

The shared component now tests string presence using `trim().length > 0`, then renders the original values. Phone, email, address, skills and motto are omitted when blank. Social entries require a nonblank link and keep their original order. Custom entries with both fields blank are omitted; one-sided entries show only the available text, with no colon. A colon remains between a populated title and value. The literal string `0` remains visible everywhere.

Contact/additional wrappers, borders and spacing are not rendered when their contents are absent. All three templates use this same component. No store/form/save/query/payload, CSS, age helper, Paper, visibility, TOC, numbering or pagination changes were made. In particular, existing scalar normalization on Save remains unchanged; Preview does not trim data into the store or remove array entries. Empty and whitespace social/custom entries remain editable and are retained in the Save payload.

## Commands and actual results

All backend requests in these checks use the existing localhost synthetic mock. No hosted database, account or Storage data was read or written.

| Check | Result in this task |
| --- | --- |
| `NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack` | PASS after application implementation; build also ran TypeScript. Existing middleware deprecation warning. No application source changed afterward. |
| `node_modules/.bin/tsc --noEmit --incremental false` | PASS after build and again after final test edits. |
| `node_modules/.bin/eslint src/components/preview/ProfilePreview.tsx tests/e2e/profile-optional.spec.ts` | 0 errors; 1 existing `no-img-element` warning. |
| `node --import tsx --test tests/age.test.ts` | 4/4 PASS, no skips; rerun during B with the same result. |
| A production browser, new basic case only | 1/1 PASS (4.0s). |
| B expanded production browser, first run | 16 PASS / 2 FAIL (41.3s). Both failures were test-fixture mistakes: email used `email` instead of the actual `contact_email`, and a single-line HTML input was expected to retain a newline. |
| B production browser after correcting fixtures | 18/18 PASS in one run (27.5s), no skips: optional Profile 6, existing age 9, Accordion/crop/session 3. Assertions remain intact; whitespace/newline coverage remains in the appropriate text/textarea fields. |
| `git diff --check`, including A commit range | PASS. |

Final browser command (existing Chromium runtime selected through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`):

```sh
node_modules/.bin/playwright test tests/e2e/profile-optional.spec.ts tests/e2e/profile-age.spec.ts tests/e2e/editor-accordion.spec.ts:85 tests/e2e/editor-accordion.spec.ts:135 tests/e2e/editor-accordion.spec.ts:209 --reporter=line
```

New coverage includes default/empty social; whitespace-only and `0`; partial scalar groups; interleaved blank/populated social and custom rows; exact raw text/order; all three templates; live edit/clear; a blank custom row remaining dirty/editable while absent from A4; leave-warning dismissal; export guard; original array payloads; Save/reload; and switching to a portfolio without those values. Existing regression checks preserve age rules, save failure/retry, dirty state, crops, mobile form/Preview and late saves from a previous portfolio.

## Visual and actual PDF inspection

- Inspected Profile screenshots for Classic/Modern/Minimal at 1440px and 390px. The changed groups and Thai text remain legible without overlap; mobile has no document-width overflow. Generated screenshots are test artifacts named `profile-{classic,modern,minimal}-{1440,390}.png`.
- Exported a small **real Minimal PDF**, with Preview hidden on a 390px viewport, using the existing renderer without mocking PDF generation. Fixture has address, two populated social entries interspersed with blank entries, motto, title-only/value-only/complete custom entries; phone/email/skills are blank.
- `python tests/pdf-inspect.py <download>`: Preview 7 papers / PDF 7 pages, 7 distinct painted page rasters, **438,258 bytes**, every page **595.28 × 841.89 pt (A4)**.
- SHA-256 of the inspected download: `69f9b0e1f637c48a1cf6f08c131bac679f4b3a763ceba3b4455de9f7099594a1`.
- Rendered physical page 4 using `pdftoppm -f 4 -singlefile -scale-to 1400 -png <download> <output>` and opened the image. Confirmed no blank phone/email/skills rows or platform-only social rows; retained address, ordered Line/Facebook entries, motto and all three populated custom shapes. One-sided custom text has no floating colon. Basic information and footer number 1 remain intact. No OCR claim: the PDF remains raster as before.
- PDF and PNGs are reproducible Playwright output artifacts, not additional application assets. The existing inspection script emits a Pillow deprecation warning but completes successfully.

## Scoped plan status and limits

This closes only **omission of empty optional Profile rows/groups**. For M06.05/M08.03, this subtask is verified with mock data plus a real PDF renderer; the parent items remain **PARTIAL**. It does not implement automatic hiding for other sections, hiding the entire Profile Paper, automatic empty-page rules or a full page model.

Status is recorded here rather than republishing the full implementation plan that previously encountered publication restrictions. Historical reports remain unchanged. No attempt was made to bypass a rejected publication or include target metadata.

Manual age override remains pending. Storage cleanup, migrations and integration remain with Astra; Section Visibility PostgreSQL/PostgREST acceptance and hosted integration remain **NOT_RUN/unverified**. Chromium viewport emulation is not a physical-phone test, and mock Save/reload is not hosted persistence/RLS verification. No dependencies, schema or production data changed. No PDF 14 MB fixture or unrelated whole-system suite was run.
