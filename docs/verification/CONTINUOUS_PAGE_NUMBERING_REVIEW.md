# Continuous page numbering review

## Starting point and scope

- Repository zenecoil0-design/projectfinal; branch codex/portfolio-next-phase.
- Starting local/remote HEAD: `72d1164e2a7e0896c1c0d9230beef8d47b8e46d9`; working tree clean.
- Read AGENTS and relevant PRD/ARCHITECTURE/DESIGN_SYSTEM, Minimal/page-limit/large-file reports and installed Next server/client guide. Current source is the baseline; old attachments were not copied over it.
- This round implements continuous printed numbers only. No TOC, visibility, new page model, image-count/validation, database or storage changes.

## Part A — computation and rendering

- Pure `documentPageNumbers` consumes actual document order with stable section IDs and a numbered flag. Returns physical index (all paper pages) and printed index (content only). No database field, per-section offset formula or Accordion step dependency.
- `Paper` emits section ID/numbering metadata. `PageLayout` observes only its live Preview subtree and derives numbers from actual rendered Paper nodes in document order, independent of component mount order. Measurement remains in its body portal and clones remain outside this root.
- `PageNumber` creates an empty span inside the existing footer. The coordinator alone assigns that span's text/accessible label; React has no competing text state. Equality checks prevent observer feedback loops. No React count registry or stale offset snapshot.
- Only measurement callbacks register in a local Set; effect cleanup unregisters them. Live roots are in a WeakMap; cleanup disconnects the observer/removes the root. New portfolio/account Preview has a fresh scope; Strict Mode cleanup/setup does not retain counts.
- Before export, after the existing font/image decode/fetch gates finish, `preparePageLayout` flushes the current registered measurements through React's existing `flushSync`, so all packing state reaches the DOM. It then numbers and validates that committed DOM before inspectPages/clone. This replaces reliance on two animation frames, without a fixed timeout. Existing packPages algorithm/840px budget/24px gap remain unchanged.
- The export button and its existing physical DOM page counter/lifecycle remain unchanged. The same rendered text is cloned into PDF; there is no independent PDF numbering pass.
- Removed section-local x / y labels. Number span is out of flow at right 64px / bottom 20px; it does not change card/heading/footer height. It stays inside the last footer div, preserving all first-child/last-child selectors. Modern's lower-left decoration and the lower-right number do not share space.

### Actual checks A

- Pure numbering unit **3/3 passed**: example with multi-page sections; absent profile and extra front matter; independent repeated calculations/reset.
- Existing PDF result/format unit **2/2 passed**.
- Browser mock: three-template six-page/folded Accordion case passed; multi-page education/activity, deselection, dirty guard and new-portfolio reset case passed after correcting its mock selection routes to filter portfolio ID. Initial test failure was an overbroad fixture returning A selections to B; application loaders were not changed to accommodate it.
- Scoped ESLint **0 errors, 9 pre-existing img warnings**. `git diff --check` passed after correcting an import placement/newline introduced while editing.
- Production build, real PDF/async/mobile checks are Part B and not claimed yet.
- A published commit: `99e5d5877e860991d6a7f4ba38836d599e1559fd`. GitHub connector publication used a non-force expected-parent update; complete tree compared with tested local commit, fetched and verified local/remote equal before B.

## Example mapping

| Section | Physical pages | Printed numbers |
| --- | --- | --- |
| cover | 1 | none |
| preface | 2 | none |
| profile | 3 | 1 |
| education (2 pages) | 4–5 | 2–3 |
| activity (3 pages) | 6–8 | 4–6 |
| certificate | 9 | 7 |

Toolbar total is 9. Empty sections still contribute the pages that existing renderers actually create.

## Part B

### Additional changes and lifecycle

- Removed the decorative `01 /` prefix from Modern cover's existing PORTFOLIO footer. It could be mistaken for a page number, contrary to the unnumbered-cover requirement. No other template decoration/layout changed.
- Added real PDF tests for Classic/Modern six-page documents and a Minimal seventeen-page document, hidden-mobile/late-image tests and observer cleanup checks on SPA portfolio/account changes. Extended the multi-page selection case to switch all three templates and verify numbers and selected education order for each layout.
- Explicitly withheld ResizeObserver delivery after initial layout, then released a late image while export was waiting for decode. Export's registered measurements repacked one activity page into two even without observer delivery. Preview/PDF became seven physical pages, final printed number 5; old offsets were not captured.
- SPA portfolio switch leaves exactly one live numbering observer; account change leaves zero and no numbered DOM. Dev Strict Mode exercised cleanup/setup; measurement callbacks unregister with their component and old root WeakMap entry is removed.
- New detached-layout readiness check stops an old session before rendering. Two existing generating-phase size tests initially expected the old renderer to complete all three quality levels; they failed because the new code correctly produced zero. Updated them to observe the real native isConnected result, assert detached-layout rejection occurred, assert zero old PDF builds, and retain all no-dialog/no-download/no-URL/new-session assertions. This strengthens cancellation checks instead of reducing their intent. Already-running canvas work after layout capture is still not actively aborted.

### PDF files actually downloaded and opened

| Fixture | Preview / PDF physical pages | Printed numbers | Bytes |
| --- | ---: | --- | ---: |
| Classic baseline | 6 / 6 | none, none, 1–4 | 433,160 |
| Modern baseline | 6 / 6 | none, none, 1–4 | 454,350 |
| Minimal multi-section, hidden mobile Preview | 17 / 17 | none, none, 1–15 | 2,784,463 |
| Late image, observer delivery withheld | 7 / 7 | none, none, 1–5 | 529,387 |

All pages in these four files have A4 mediabox 595.28 × 841.89 pt. Number of unique painted page rasters equals number of pages in each audited main fixture. PDF tests use the real createPortfolioPdf/html-to-image/jsPDF renderer; data requests are mocked, but these files and their sizes are real. No page-number data attribute or download event is used as a substitute for visual PDF validation.

Minimal mapping in the actual seventeen-page file:

| Section | Physical pages | Printed numbers |
| --- | --- | --- |
| Cover / preface | 1 / 2 | none / none |
| Profile | 3 | 1 |
| Education, nine selected entries | 4–6 | 2–4 |
| Activities, ten selected entries | 7–16 | 5–14 |
| Certificate | 17 | 15 |

Physical pages 10/11 print 8/9; pages 12/13 print 10/11; final physical page 17 prints 15. Toolbar total remains 17.

Used pdfinfo and pypdf to read real files, pdftoppm to render Classic/Modern pages 1–6 and Minimal 1/2/3/4/6/7/10/11/17. Opened cover/preface, content start, section transitions, post-ten pages and final pages at readable resolution. Checked all printed digits across the four files using a contact sheet cropped directly from the PDF page rasters, with no OCR and no replacement digits: [actual PDF number strips](assets/continuous-page-numbers.png). The Modern cover strip contains the word PORTFOLIO, with no numeric prefix.

Number placement is below content, right-aligned in the page margin; no overlap with footer rules/text or Modern's lower-left decoration. Existing first/last child styling remains intact. Browser geometry assertions also check every number lies inside A4 and below its content area. Desktop 1440px and mobile 390px covered. Existing Minimal regression additionally checks long Thai, mixed image orientations and equal measurement/A4 geometry.

### Verification actually run

- A unit **5/5 passed** total: numbering helper 3 and existing PDF result/format 2.
- A browser cases passed individually after fixing the portfolio-filter fixture described above.
- B dev late-image sizing and SPA cleanup cases passed. Generating-phase existing tests then required the cancellation expectation update described above; targeted lifecycle rerun **4/4 passed (28.7s)**.
- **One production build passed** after implementation was complete: compile, TypeScript and static generation. Existing middleware-to-proxy deprecation warning only.
- Production browser regression **69/69 passed (1.9m)** in one run: Accordion 6, Tags 21, Editor 12, library-selection 6, Minimal 5, numbering 7, PDF export 4, size/lifecycle mock 8. Excluded only the expensive existing `real oversized A4 PDF` case through test selection, as permitted; no skip or removal of assertions. Kept real 12/20/25-page export regressions and dirty/main-loading/Tags-only/overflow/decode/fetch/renderer/no-page/retry/confirmation/lock assertions.
- Added the multi-page three-template switching assertions afterward and reran only that affected case on the same production build: **1/1 passed (3.8s)**. No application source changed after the build. No unrelated full rerun.
- Scoped ESLint **0 errors, 9 existing img warnings**, final test-file lint clean; git diff --check passed. The application still uses its existing direct img pipeline. Python visual helper executed successfully against all four real PDFs; existing inspector has a Pillow getdata deprecation warning.

Commands run from repository root:

```sh
node --import tsx --test tests/page-numbers.test.ts tests/pdf-result.test.ts
npx playwright test --config=/tmp/numbering-dev.config.cjs page-numbering.spec.ts --reporter=line --max-failures=2
npx playwright test --config=/tmp/numbering-dev.config.cjs tests/e2e/page-numbering.spec.ts tests/e2e/pdf-size.spec.ts --grep 'late image sizing|SPA portfolio|change during' --reporter=line --max-failures=2
npx playwright test --config=/tmp/numbering-dev.config.cjs tests/e2e/pdf-size.spec.ts --grep 'change during' --reporter=line --max-failures=1
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/page-numbering.spec.ts tests/e2e/editor.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/minimal-template.spec.ts tests/e2e/pdf-export.spec.ts tests/e2e/pdf-size.spec.ts --grep-invert 'real oversized A4 PDF' --reporter=line --max-failures=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/page-numbering.spec.ts --grep 'multi-page education' --reporter=line --max-failures=1
npx eslint src/lib/editor/page-numbers.ts src/lib/editor/page-layout.ts src/lib/editor/export-pdf.ts src/components/preview/{PageLayout,Paper,PaginatedSection,CoverPreview,PrefacePreview,ProfilePreview,EducationPreview,ActivityPreview,CertificatePreview}.tsx tests/page-numbers.test.ts tests/e2e/page-numbering.spec.ts tests/e2e/pdf-size.spec.ts
git diff --check
pdfinfo <actual-numbered.pdf>
python tests/pdf-inspect.py <actual-numbered.pdf>
pdftoppm -f <page> -l <page> -singlefile -scale-to 1000 -png <actual-numbered.pdf> <output-prefix>
python tests/pdf-numbering-contact-sheet.py <output.png> <classic.pdf> <modern.pdf> <minimal.pdf> <late-image.pdf>
```

Browser runtime is temporary Chromium 153 with matching SwiftShader outside the application. No app dependency or lockfile changes.

### Files and effect on callers

- New pure helper: src/lib/editor/page-numbers.ts; DOM preparation/observer scope: page-layout.ts; client scope/footer span: components/preview/PageLayout.tsx.
- Paper plus all six Preview entry points now carry stable section IDs; only profile and paginated sections render number spans. PaginatedSection registers its existing measurement function and retains the packing algorithm/budget. globals.css contains footer number positioning and template-specific text colors; minimal-template.css is untouched.
- export-pdf.ts has one caller, ExportButton. It now prepares current layout after assets and before inspecting/capturing pages. No changes to result contract, Blob identity/size threshold, quality levels, sequential canvas or cleanup. ExportButton/EditorSession/session save/dirty/Tags guards are untouched.
- Tests: page-numbers.test.ts, e2e/page-numbering.spec.ts, additive/updated lifecycle assertions in e2e/pdf-size.spec.ts, visual PDF helper/contact sheet. Updated ARCHITECTURE/DESIGN_SYSTEM and partial M08.04/M09.04 status; Minimal report retains history with a follow-up link.
- No TOC/visibility UI, page-model rewrite, card splitting, data query/save/upload/delete/auth/schema/Storage changes.

## Remaining scope

TOC, visibility, overall page model, card splitting, two-color customization and remaining PDF/Editor features are not completed by this task. Existing overflow/image-error guards and large-file same-Blob confirmation remain in place and covered by regression. Empty sections still count according to the actual existing renderer; no new hiding rule. No guarantee for infinite pages/all physical devices. The actual 14 MB fixture was not regenerated; focused size mocks covered the unaffected confirmation lifecycle.

All browser data is mocked, not live Supabase/Storage. No database or /my-data suite, migration/reset or real deletion. Final HEAD is the Part B commit containing this report (`git log -1 --format=%H -- docs/verification/CONTINUOUS_PAGE_NUMBERING_REVIEW.md`); exact B SHA/post-publication remote verification are in the handoff. A report cannot embed its own containing commit SHA without changing that SHA. Publication uses the tested full tree and the verified A parent with no force update.

## Independent Astra review — 18 October 2026

- Starting checkout and remote both verified at `75e7fc658560f39f7d6c8017582ce39e331ad531`, with a clean working tree. Reviewed numbering, measurement registration/cleanup, export preparation, template changes and regression assertions against the previous `72d1164` baseline.
- Fresh unit run: **5/5 passed** (numbering and PDF result/format). Scoped source/test lint: **0 errors, 9 existing img warnings**; diff whitespace check passed.
- Ran numbering plus size/lifecycle tests against the existing production build, excluding only `real oversized A4 PDF`. Initial result: **11/15 passed**, with four size-confirmation cases timing out waiting for a dialog after 5 seconds while real PDF rendering was still in progress. An unchanged isolated rerun of the cancel/confirm case reproduced the timeout.
- The size mock changes only Blob size; six real pages are still rendered at three quality levels before confirmation. Corrected the seven post-render dialog waits in `tests/e2e/pdf-size.spec.ts` to use an explicit **30-second maximum**, leaving normal UI waits, all assertions and the existing 150-second real-large-file wait unchanged. This is condition-based waiting, not a fixed sleep; no retries, skipped tests, renderer stubs or application changes were added.
- Reran the complete focused selection after the correction: **15/15 passed in one run (1.5 minutes)**. It includes numbering 7 and size/lifecycle 8, preserving cancel/Escape/focus/keyboard/mobile/Blob identity/export lock/URL cleanup and old-session rejection checks. Final changed-test lint has **0 errors and 0 warnings**.
- Independently regenerated real Classic/Modern/Minimal/late-image PDFs through the tests. Their page counts were **6/6/17/7**, with A4 checks passing. Opened a contact sheet cropped from all four actual PDFs: front matter has no printed numbers; content runs **1–4 / 1–4 / 1–15 / 1–5** without gaps. Also rendered and opened Minimal's final full page: printed **15** is within the lower-right A4 margin and clear of the footer/content.
- No application source changed, so no new production build was required. This review does **not** claim a fresh 69-test full-suite run, regeneration of the 14 MB fixture, live Supabase/Storage verification or testing on physical phones. The test timeout correction is the only code change from this review; no product defect was found in the reviewed numbering scope.

Review commands (temporary browser executable/output paths are environment-specific):

```sh
node --import tsx --test tests/page-numbers.test.ts tests/pdf-result.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<chromium> npx playwright test tests/e2e/page-numbering.spec.ts tests/e2e/pdf-size.spec.ts --grep-invert 'real oversized A4 PDF' --output=<review-output>
npx eslint tests/e2e/pdf-size.spec.ts
git diff --check
python tests/pdf-numbering-contact-sheet.py <review-sheet.png> <classic.pdf> <modern.pdf> <minimal.pdf> <late-image.pdf>
pdftoppm -f 17 -l 17 -singlefile -scale-to 1100 -png <minimal.pdf> <review-final-page>
```
