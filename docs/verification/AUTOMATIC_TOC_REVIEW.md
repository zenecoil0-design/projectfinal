# Automatic section-level TOC review

## Baseline and scope

- Repository zenecoil0-design/projectfinal, branch codex/portfolio-next-phase.
- Starting local/remote HEAD `88875774872b6e0957d22292fe342ecd6457d79b`; clean working tree. Preserved Astra's 30-second condition-based PDF confirmation waits and independent numbering review.
- Read AGENTS, relevant PRD/ARCHITECTURE/DESIGN_SYSTEM, continuous numbering report including Astra's review, installed Next use-client guide and actual Preview/export paths. Old attachments were not used to overwrite repository source.
- Scope: one automatic section-level TOC page between preface and profile. No form or database state for TOC, no visibility, bookmarks/clickable PDF links, per-item entries or multi-page TOC.

## Part A

- `documentContents` derives unique content-section starts directly from `documentPageNumbers` output; physical offsets are not recalculated. Names come from actual Paper section headings, selected by stable ID. Cover, preface and TOC have null printed numbers, so cannot become TOC entries. Missing sections are supported by the pure helper.
- `ContentsPreview` uses the existing Paper with the separate page kind `toc`; Editor's six form sections/readiness/save state remain unchanged. Physical counter includes TOC; profile still prints 1.
- Existing scoped numbering coordinator owns both footer text and the generated empty ol's children. It compares section IDs/titles/printed starts before replacing rows, preventing observer feedback loops. Observes relevant section attributes as well as DOM changes. Existing session cleanup/WeakMap scope excludes measurement portals and PDF clones.
- Existing pre-export preparation flushes current measurements into React, computes footer numbers and TOC together, then validates both before export captures any pages. No new timeout, renderer or packing algorithm.
- Preview scrolling now finds the first Paper by stable section ID rather than positional refs; adding TOC does not change six-step form navigation.
- TOC uses matching white/slate Classic, cream/green Modern and thin-rule Minimal styles, retaining A4 dimensions and whole-page scaling. No printed footer number on TOC.

### Checks actually run in A

- Unit **8/8 passed**: TOC 3, numbering 3, existing PDF result/format 2. Includes the 18-paper example yielding content starts 1/2/5/15, omitted content and extra front matter, independent recalculation.
- Initial browser run **1 passed / 1 failed**: navigation test expected a scroll without triggering navigation because Cover was already open. Corrected the test to fold then reopen the section; no application change for that test setup.
- Final browser selection **2/2 passed (24.3s)**: all templates/basic seven pages, current footer/TOC agreement, navigation to six sections, multi-page deselect/reselect/template switching, dirty export guard and original baseline after restoring selection.
- Scoped ESLint **0 errors/0 warnings**; git diff --check passed.
- Data source is mock Supabase, not live database/Storage. Production build/real PDF validation is Part B and not claimed from these results.
- A published/verified HEAD: `b90050aa66d8ecd84359d5c6d5aad2f46996de9a`. The configured GitHub connector created an equivalent commit with the exact tested Git tree because shell push has no credentials. Expected-parent, non-force ref update; fetched and confirmed identical local/remote HEAD and tree before B.

## Part B

### Implementation, expectations and lifecycle

- Updated only physical-page-dependent expectations in Editor, Minimal, numbering and PDF export tests: basic 6 → 7; marker documents 12/20 → 13/21 with the same selected cards/images/order. Retained assertions for content, images, selection order, guards, failure recovery and Blob identity. The 30-second `PDF_CONFIRMATION_TIMEOUT` and all Astra's condition-based waits are preserved; only that file's comment now says seven pages.
- Extended existing numbering regression to compare current TOC entries against the actual first footer of each section, including multiple pages, template changes, deselection/empty renderers, late images, hidden Preview, portfolio/account changes and observer cleanup. A live Preview root has one coordinator; after account change no root/footer/TOC entry remains. No new subscriptions or persistent session registry.
- Added explicit desktop navigation to all six sections and mobile profile navigation after resize. This discovered a real scroll/scale race: the old animation-frame scroll could calculate using the previous scale when revealing a resized Preview. Moved scrolling into PreviewViewport's layout effect, keyed only by active section, visibility and committed scale. It uses the same stable Paper section ID and waits for scale to match the actual viewport width. No fixed timeout, extra fetch/save, positional index offset or automatic scroll on every render. Existing ResizeObserver still disconnects on unmount.
- TOC is presentation-only; no EditorSession/store/baseline/payload change. Six forms retain their original readiness and save flow. Existing export preparation continues waiting for fonts/images, flushing measurement, then synchronizing and validating both footer and TOC in the committed live DOM before capture. Measurement portal and PDF clones never register with the coordinator. Renderer, packing, A4, quality levels and large-file confirmation are unchanged.

### Actual verification chronology

1. First production build passed. Focused production regression **71/71 passed (2.1m)**: Editor 12, Tags 21, Accordion 6, selection 6, Minimal 5, numbering 7, PDF export 4, size/lifecycle 8, TOC 2. No skip or reduced content assertions. The existing expensive real oversized 14 MB fixture was excluded by command selection, as allowed; boundary/confirmation/Blob identity tests still ran using size mocks with the real renderer.
2. Added a narrower mobile scroll assertion after that run; its first run **0/1 passed**, revealing the scale race above (expected profile top 24px, actual -1546px). This was not claimed as a pass or hidden by weakening the assertion.
3. Applied the viewport scroll fix, then rebuilt because application source changed. Second production build passed (compile, TypeScript, all nine static pages). Existing middleware-to-proxy deprecation warning remains; unrelated code was not changed.
4. On that final production build, reran only affected TOC/numbering/Accordion/size lifecycle regression: **23/23 passed (58.9s)**. Includes the unchanged exact 24px mobile navigation assertion, late image with withheld ResizeObserver, all three real PDFs, dirty/crop/save/late-session controls, cancellation/Escape, confirmation locks and same Blob on confirm. No source changes after this build/run.
5. Final scoped ESLint **0 errors / 0 warnings**; `git diff --check` passed. The A unit results remain **8/8**; pure helper source did not change in B, so those tests were not needlessly rerun. CSS was checked by build and browser rendering; no CSS-specific linter is configured. npm proxy-env/NO_COLOR and the existing PDF audit Pillow deprecation warnings do not indicate test failure.

Commands actually used (environment paths are local test tooling, not new app dependencies):

```sh
node --import tsx --test tests/toc.test.ts tests/page-numbers.test.ts tests/pdf-result.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test --config=/tmp/toc-dev.config.cjs tests/e2e/toc.spec.ts --reporter=line --max-failures=2
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/toc.spec.ts tests/e2e/page-numbering.spec.ts tests/e2e/editor.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/minimal-template.spec.ts tests/e2e/pdf-export.spec.ts tests/e2e/pdf-size.spec.ts --grep-invert 'real oversized A4 PDF' --reporter=line --max-failures=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/toc.spec.ts --grep 'inserting it preserves navigation' --reporter=line --max-failures=1
# After the scroll fix and required rebuild:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/toc.spec.ts tests/e2e/page-numbering.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/pdf-size.spec.ts --grep-invert 'real oversized A4 PDF' --reporter=line --max-failures=2
npx eslint src/app/editor/page.tsx src/components/preview/Paper.tsx src/components/preview/ContentsPreview.tsx src/lib/editor/page-layout.ts src/lib/editor/page-numbers.ts tests/toc.test.ts tests/e2e/helpers/toc.ts tests/e2e/toc.spec.ts tests/e2e/page-numbering.spec.ts tests/e2e/editor.spec.ts tests/e2e/minimal-template.spec.ts tests/e2e/pdf-export.spec.ts tests/e2e/pdf-size.spec.ts
git diff --check
pdfinfo <downloaded.pdf>
pdftoppm -f <page> -l <page> -scale-to 1000 -png -singlefile <downloaded.pdf> <output>
python tests/pdf-numbering-contact-sheet.py <output.png> <classic.pdf> <modern.pdf> <minimal.pdf> <late-image.pdf>
```

### Real PDF checks (mock data, real renderer/downloaded PDFs)

| Fixture | Preview / PDF papers | Printed content numbers | TOC section starts | Bytes |
| --- | ---: | --- | --- | ---: |
| Classic, basic six content/form categories | 7 / 7 | 1–4 | 1, 2, 3, 4 | 499,815 |
| Modern, basic | 7 / 7 | 1–4 | 1, 2, 3, 4 | 533,762 |
| Minimal, 9 educations / 10 activities, mobile hidden Preview and folded Accordion | 18 / 18 | 1–15 | 1, 2, 5, 15 | 2,844,222 |
| Classic, late activity images / withheld ResizeObserver | 8 / 8 | 1–5 | 1, 2, 3, 5 | 596,058 |

Actual Minimal mapping, not hardcoded implementation offsets:

| Physical paper | Section | Printed number(s) | TOC entry |
| --- | --- | --- | --- |
| 1 | Cover | None | Excluded |
| 2 | Preface | None | Excluded |
| 3 | TOC | None | Excluded |
| 4 | ประวัติส่วนตัว | 1 | 1 |
| 5–7 | ประวัติการศึกษา | 2–4 | 2 |
| 8–17 | ผลงานและกิจกรรม | 5–14 | 5 |
| 18 | เกียรติบัตร | 15 | 15 |

- Read page count and every MediaBox from downloaded PDFs with existing Python/pypdf audit; all A4 **595.28 × 841.89 pt**. Unique painted page raster count equals physical pages, with no duplication/truncation. No Blob-size/renderer mock for these four files. Database requests alone are mocked.
- Rendered and opened all three TOCs and profile/education/activity/certificate starts/final pages. Opened the late-image TOC and actual-footer contact sheet covering every physical page, including Minimal paper 10 (printed 7), 11 (printed 8), 14 (printed 11) and final paper 18 (printed 15). Thai names/numbers remain readable; no TOC/footer clipping or overlap. Basic files have 1/2/3/4 matching physical starts 4/5/6/7; the late-image TOC correctly advances certificate from 4 to 5 before export.
- Final post-fix downloads have the same per-page decoded raster SHA-256 sequence and byte sizes as the visually inspected pre-scroll-fix PDFs. Whole-file hashes differ due to normal PDF generation metadata; pixel identity was verified for every page, not inferred from matching size.
- Checked desktop 1440px and mobile 390px Preview; mobile real 18-page PDF is exported before Preview has ever been opened, with all panels folded. Returning to form retains folded state, draft/selection tests remain in regression. Mobile TOC fits the same whole-A4 scale.
- Retained small visual artifacts: [Classic PDF TOC](assets/toc-classic.png), [Modern PDF TOC](assets/toc-modern.png), [Minimal PDF TOC](assets/toc-minimal.png), [390px Preview TOC](assets/toc-mobile.png), [actual printed footer contact sheet](assets/toc-printed-numbers.png). These are mock fixtures, not personal data.

### Files and publication

- Application: `src/lib/editor/page-numbers.ts`, `src/lib/editor/page-layout.ts`, `src/components/preview/ContentsPreview.tsx`, `src/components/preview/Paper.tsx`, `src/app/editor/page.tsx`, `src/app/globals.css`. No changes to the PDF renderer, packPages, EditorSession or six form loaders/save handlers.
- Tests: new TOC helper/unit/browser tests; physical-page expectations updated in the affected Editor/Minimal/numbering/PDF tests, with original assertions retained.
- Current status updated in ARCHITECTURE, DESIGN_SYSTEM, IMPLEMENTATION_PLAN and follow-ups in numbering/Minimal reviews. Historical Astra reviews/results remain intact.
- B commit is the commit containing the final version of this report; its exact local/remote SHA and full tested-tree verification are supplied in the final handoff after publication. Self-hashing a report commit would change its SHA, so it is not fabricated here. A remains `b90050aa66d8ecd84359d5c6d5aad2f46996de9a`.

## Remaining work

Multi-page/per-item TOC, visibility, overall page model, autosave, two-color customization, oversized-card splitting and the rest of Editor/PDF are separate. No schema/query/RPC/RLS/auth/Storage, migration/reset, real deletion, dependency or main changes. No live Supabase/Storage or physical-phone test; Chromium desktop/mobile emulation only. Existing oversized-card overflow guard remains; no cross-page splitting. No fresh real 14 MB fixture was generated this round, as explicitly allowed, but confirmation and Blob identity regression ran before and after the scroll fix. No database or /my-data full suite was run because neither changed.

Final HEAD is the B commit containing this report (git log -1 --format=%H -- docs/verification/AUTOMATIC_TOC_REVIEW.md). Exact A/B remote SHAs and tested-tree verification are recorded in the handoff after publication; a commit cannot embed its own SHA without changing it.
