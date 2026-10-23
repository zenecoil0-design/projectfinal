# Optional section card content — review (2026-10-24, Asia/Bangkok)

## Scope and publication

- Repository `zenecoil0-design/projectfinal`, branch `codex/portfolio-next-phase`.
- Starting local/remote HEAD: `0df1e1f484465afa646750be8912821175d580b8`; working tree clean. Existing archived worktrees preserved.
- A published and remote/tree verified before B: `68739acfb73676534b8d1249e2fa82e845635552`, tree `c0742907c99f40e628a2bb176165eee82fe4eae3`.
- B is the commit containing this report, the focused CSS correction and expanded regression. Its actual published SHA and final local/remote equality are supplied in the delivery message. No main changes, reset, clean or force-push.

## Changes and boundaries

The three Preview components previously rendered optional whitespace strings as rows. Education always rendered a logo frame/icon and a level fallback, and supplied `?`/`ปัจจุบัน` for missing year endpoints. Activity/Certificate rendered a dashed no-image placeholder for empty arrays (Minimal hid it through CSS).

- `EducationPreview.tsx`: omit blank level/study plan/GPAX and an absent logo frame; preserve existing school-name behavior. Both years show the original range; a single endpoint shows `ปีเริ่มต้น:` or `ปีสิ้นสุด:`; neither creates no year row.
- `ActivityPreview.tsx` / `CertificatePreview.tsx`: omit whitespace-only organization/issuer/date/description and render no image area for `images.length === 0`. Keep every supplied image URL in its existing order, including legacy certificates with more than two images. Broken URLs are not filtered out.
- All presence checks use trim only for presentation. Original strings, stores, selections, validation and payloads remain unchanged; `0` remains visible. No entire card/section is automatically hidden.
- `globals.css`: `[data-template] .document-card { line-height: 1.6; }` matches the existing A4 inherited line metrics in body-level measurement portals. Diagnosis found Classic card heights of 106 vs 108px (title-only) and 349 vs 350px (with image), despite equal markup and 666px width. The portal inherited body's line-height instead of A4's. This scoped rule fixes measurement without changing Preview's intended typography, font size, margins, 840px pack budget or packPages.
- No changes to Paper, visibility preferences, numbering/TOC calculation, renderer, compression, image limits or overflow guards. Existing image `contain` behavior is preserved. No Storage/database/schema work or new dependencies.

## Verification actually run

| Round | Actual result |
| --- | --- |
| A production build | PASS; Next 16.2.9 webpack, existing middleware deprecation warning. |
| A focused browser | 2/2 PASS (4.2s): title-only/whitespace and four education-year combinations plus zero, across all templates. |
| B first regression on A build | 22 PASS / 2 FAIL out of 24 (56.8s). Old Minimal assertion expected two CSS-hidden placeholders; new geometry assertion found the real 1–2px portal mismatch above. |
| B diagnostic geometry case | 0/1 PASS; logged equal markup/width and differing inherited heights, confirming the cause before source correction. |
| B build after CSS source fix | PASS. No application source changed after this build. |
| B final combined production regression | **26/26 PASS in one run (54.8s)**, no skips. Includes 5 new cases, selection/load/save 6, TOC 2, numbering/late-image 2, Minimal 4, desktop/mobile overflow 2, visibility 4, image decode/fetch/no-page error 1. |
| Full-repo TypeScript | PASS after A build and after final B build/test edits. |
| Unit | `page-numbers.test.ts` + `pdf-result.test.ts`: 5/5 PASS; final run after CSS fix. |
| Final scoped ESLint | 0 errors; 3 pre-existing `no-img-element` warnings, one per Preview component. |
| Diff checks | PASS for working changes and published A range; final range checked at delivery. |

Commands used from the repository root:

```sh
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint src/components/preview/EducationPreview.tsx src/components/preview/ActivityPreview.tsx src/components/preview/CertificatePreview.tsx tests/e2e/section-optional.spec.ts tests/e2e/minimal-template.spec.ts
node --import tsx --test tests/page-numbers.test.ts tests/pdf-result.test.ts
git diff --check
```

Final Playwright invocation used the existing Chromium runtime through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`:

```sh
node_modules/.bin/playwright test tests/e2e/section-optional.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/toc.spec.ts tests/e2e/page-numbering.spec.ts:27 tests/e2e/page-numbering.spec.ts:95 tests/e2e/minimal-template.spec.ts:85 tests/e2e/minimal-template.spec.ts:107 tests/e2e/minimal-template.spec.ts:121 tests/e2e/minimal-template.spec.ts:146 tests/e2e/editor.spec.ts:109 tests/e2e/editor.spec.ts:198 tests/e2e/section-visibility.spec.ts:183 tests/e2e/section-visibility.spec.ts:286 tests/e2e/pdf-export.spec.ts:111 --reporter=line
```

The old Minimal expectation now requires zero placeholder elements and explicitly retains both item titles. No data/order/overflow/lifecycle assertion was removed. No fixed sleep, skip or suite-wide timeout increase was introduced.

## Coverage, images and actual PDF

New fixture preserves two education items (no logo / portrait logo), activities with 0/1/4 images, and certificates with 0/1/2/3 images. Image rows deliberately arrive in reversed order but must render according to their persisted sort_order. Tests check original URLs, counts, contain, titles, raw nonblank whitespace, and zero values. The three templates have identical measured/rendered card markup, widths and heights within 1px after the fix.

Existing selection tests verify all three categories' draft order, failed Save/retry, atomic payload, dirty leave warning, reload and mobile panels. Additional checks retain hidden-section preferences after reload, remove hidden Papers/TOC rows, keep selected items, reject image failures for all three categories, flush late image sizing with withheld ResizeObserver, and preserve overflow on desktop/hidden mobile Preview. No new backend writes beyond the localhost mock.

Inspected affected card screenshots for Classic/Modern/Minimal at 1440px and Minimal at 390px; the selection regression also checks all three category forms at both widths. No text overlap or horizontal document overflow was found. Screenshots are generated Playwright artifacts `{template}-{section}-1440.png` and `minimal-{section}-390.png`; they are not application assets.

The new Minimal fixture exported through the **real renderer while Preview was hidden on mobile**. `tests/pdf-inspect.py` reports **10 Preview papers = 10 PDF pages**, 10 distinct painted page rasters, **641,752 bytes**, every page **595.28 × 841.89 pt (A4)**. SHA-256: `2b21c2b4bc93b1c7b678fabdcadd52bf88441c9946e8b80d610d1106eef62c7c`.

| Physical paper | Section | Printed number | TOC start |
| --- | --- | --- | --- |
| 1–3 | Cover, preface, TOC | none | not listed |
| 4 | Profile | 1 | 1 |
| 5 | Education | 2 | 2 |
| 6–7 | Activity | 3–4 | 3 |
| 8–10 | Certificate | 5–7 | 5 |

Opened Poppler renders of physical pages 3 and 5–10. Confirmed Thai TOC starts match actual footers; title-only cards have no absent-logo/no-image frame or blank metadata rows; the portrait/landscape/square images and ordered four-image activity remain complete. The legacy three-image certificate on the final page retains all three images. No OCR or searchable-text claim: output remains raster. PNG inspection could not decode one Poppler PNG, so those pages were rendered again to JPEG and opened successfully.

Focused existing real-PDF regression also passes for hidden-section Classic/Modern/Minimal outputs (6/6/14 pages), late-image export, and image-failure recovery. The 14-page fixture is not a 14 MB fixture. PDF inspection emits an existing Pillow deprecation warning but completes successfully.

## Status and limits

Only omission of absent secondary data/images in these three sections is closed by this task. Together with [Profile optional-field verification](PROFILE_OPTIONAL_FIELDS_REVIEW.md), this supplies additional evidence for M06.05/M08.03, whose parent scope remains **PARTIAL**. It does not complete auto-hide for the entire system, empty-section rules, split cards or full page-model work. Scoped status is recorded here without republishing the full plan that previously encountered publication restrictions; historical evidence is unchanged.

Backend data/persistence/failure injection are **mock**, not hosted integration or RLS proof. PDF files use the actual renderer and were read/rendered. Viewports are Chromium emulation, not physical-device testing. Storage, migration and integration remain with Astra; Section Visibility PostgreSQL/PostgREST acceptance/hosted integration remain **NOT_RUN/unverified**. Manual age override, colors, duplicate/delete portfolio and split content were not started. No real data was touched.
