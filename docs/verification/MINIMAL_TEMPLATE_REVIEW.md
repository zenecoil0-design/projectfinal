# Minimal template review

## Scope and starting point

- Start HEAD local/remote: `63217b520a2b9f4ea1ad295c8582f40416831f1e`, clean working tree, branch `codex/portfolio-next-phase`.
- Presentation-only Minimal using existing `minimal` key. Main unchanged; no data/query/store/save/pagination algorithm/export pipeline changes.
- Read AGENTS, relevant PRD/ARCHITECTURE/DESIGN_SYSTEM, installed Next CSS guide, PDF page-limit and large-file reports. PDF validation uses the PDF skill's read/render workflow.

## Part A

- White, ink, muted blue-grey accent and thin rules; fixed named CSS tokens, not per-portfolio two-color settings. Cover has an asymmetric rounded portrait, left-aligned title/name and restrained footer. No background photo or invented personal content.
- Preface uses a left-aligned section rule and full-width text preserving line breaks; profile uses stacked labels and rounded portrait; library cards use open rows instead of nested colored boxes. Missing photos/logos do not reserve empty image panels in Minimal. All existing data and image order remain in the same renderer components.
- `minimal-template.css` is imported by globals but every selector is scoped to `data-template=minimal` (or Minimal-specific cover classes). Shared card classes are inert in Classic/Modern.
- Cards in the body portal and on A4 receive identical font-size/line-height/tokens/card rules. Retain 794px page width, 64px side padding, 666px content width, 24px gap and 840px pack budget. No dependency on Preview ancestry. No packPages/overflow changes.
- TemplatePicker label is now Minimal; save/failure/unknown-key behavior is untouched.

### Actual A checks

- Dev browser mock tests: **2/2 passed (22.1s)**. Six sections use Minimal; switching all three templates preserves text draft, deselection and dirty/export guard. Minimal save/reload persists, failed change retains Minimal, new portfolio resets data/template, unknown key retains fallback.
- Scoped ESLint: **0 errors, 8 img warnings** (7 existing usages, 1 Minimal cover usage). Direct img retains the existing PDF DOM-clone/crop pipeline; no lint suppression or image optimization changes.
- `git diff --check` passed. Production/PDF/visual regression belongs to B, not claimed from A.
- Data requests use mock Supabase, not live database/Storage.
- A remote commit: `0ce514eace96751644e71b7f10396fea260a5f1d`. Published through the GitHub connector because normal git push lacks credentials in this environment; compared the complete tree with the tested local commit, fetched and verified identical local/remote HEAD without force-push.

## Part B

### Implementation and visual checks

- The only application adjustment after A is a semantic `profile-social-row` class and three Minimal-only CSS rules: keep the platform label/icon from shrinking and allow a long URL to wrap independently. No save/store/query/export behavior changed.
- Expanded fixtures use different Thai cover/profile names and different photos, custom cover title, long address, talents, custom field and social URL, two education entries selected in reverse library order (one without logo/secondary details), four mixed portrait/landscape/square images and twelve ordered activities.
- Assert cover/profile photo sources separately; selected education/activity order; certificate/activity contain fit; no-photo placeholders hidden only in Minimal; actual measured card widths/heights equal rendered A4 widths/heights (height tolerance 1px).
- Desktop 1440px and mobile 390px checked. Captured six-section Preview images, opened actual PDF renders at readable resolution and checked Thai text, full certificate edges, image proportions and no overlap. Desktop capture rerun uses height 1600 so the A4 inspection area fits; normal desktop regression also used the earlier 1000px viewport. Mobile starts with Preview hidden and all Accordion panels collapsed, exports before ever revealing Preview, then returns to the same collapsed state.
- Persisted sample images: [desktop cover](assets/minimal-desktop-cover.png), [mobile cover](assets/minimal-mobile-cover.png). These contain mock fixtures, not real personal data. PDF renders and remaining screenshots are reproducible Playwright outputs, not live-user exports.

### Actual PDF files after the final application change

| Fixture | Preview | PDF | Bytes | Audit |
| --- | ---: | ---: | ---: | --- |
| Six sections, long Thai, two education entries, four activity/certificate images | 6 | 6 | 679,276 | Every page A4, six unique page rasters |
| Mobile hidden Preview, 12 ordered activities plus other sections | 17 | 17 | 3,186,460 | Every page A4, 17 unique page rasters |

Every PDF page has mediabox 595.28 × 841.89 pt (210 × 297 mm). `tests/pdf-inspect.py` reads the actual image painted by each page's Do operation, not all shared image resources. Both files use the real createPortfolioPdf/html-to-image/jsPDF pipeline and real downloaded files; only their data source is mocked. No renderer/Blob-size mock in these two cases.

Rendered with pdftoppm and visually opened all six section pages, plus physical pages 10, 11 and 17 of the long document. Page 10 is ORDER 05, page 11 ORDER 06, and page 17 is the certificate section, matching Preview order. Thai remains legible; full certificate images and mixed image orientations are retained. Cover/profile frames intentionally use cover fit on their own sources; library document images use contain. PDF remains raster, not searchable Thai text.

### Actual verification chronology

1. Production build passed after A; new Minimal suite **5/5 passed (14.6s)**. Initial fixtures produced 623,434 / 3,130,618 bytes before expanding the education/talents fixtures. These are history, not final file sizes.
2. Existing affected Editor/Tags/Accordion/selection/PDF regression **57/57 passed (1.7m)**. Selected all existing tests in the six files except the expensive real 14 MB fixture, explicitly excluded by name; no assertion removed and no test code skipped. Covers Classic/Modern exports, crop/draft preservation, main/dirty guards, Tags-only failures, overflow desktop/mobile, real 12/20/25-page PDFs, renderer/image failure retry, locks and async session cleanup.
3. Visual review identified the social-label squeeze. Applied only the Minimal row fix and rebuilt as required: second production build passed. Middleware convention deprecation warning remains; no unrelated build/type changes.
4. On the final production build, affected regression **15/15 passed (49.0s)**: Minimal 5, PDF size/lifecycle mock 8, Classic/Modern scale/cover regression 2. The existing oversized mock test now explicitly selects Minimal and checks picker locking during generation/confirmation, unlock after cancel, and the same Blob after confirm. All original assertions retained. Late session, double confirmation, cancellation/Escape and keyboard/mobile coverage preserved.
5. Test-only desktop screenshot viewport refinement: reran only six-section desktop case **1/1 passed (5.4s)**; final PDF still 6 pages / 679,276 bytes. No application source changed after the second build. No unrelated full-suite rerun.
6. Unit PDF result/format **2/2 passed**. Final scoped ESLint: **0 errors, 9 img warnings** across changed TSX files (8 pre-existing usages including ProfilePreview, 1 new Minimal cover usage). CSS checked through the successful production build and browser rendering; no CSS-specific linter configured. `git diff --check` passed.

Commands run (from repository root):

```sh
npx playwright test --config=/tmp/minimal-dev.config.cjs minimal-template.spec.ts --reporter=line --max-failures=2
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/minimal-template.spec.ts --reporter=line --max-failures=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/editor.spec.ts tests/e2e/editor-tags.spec.ts tests/e2e/editor-accordion.spec.ts tests/e2e/library-selection.spec.ts tests/e2e/pdf-export.spec.ts tests/e2e/pdf-size.spec.ts --grep-invert 'real oversized A4 PDF' --reporter=line --max-failures=2
# After Minimal social-label fix and the second build:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/minimal-template.spec.ts tests/e2e/pdf-size.spec.ts tests/e2e/editor.spec.ts --grep 'Minimal|size mock|oversize mock|confirmation keyboard|change during|A4 scales|cover frames' --reporter=line --max-failures=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/pdf-browser/chromium npx playwright test tests/e2e/minimal-template.spec.ts --grep 'six-section desktop' --reporter=line --max-failures=1
node --import tsx --test tests/pdf-result.test.ts
npx eslint src/components/editor/TemplatePicker.tsx src/components/preview/CoverPreview.tsx src/components/preview/ProfilePreview.tsx src/components/preview/EducationPreview.tsx src/components/preview/ActivityPreview.tsx src/components/preview/CertificatePreview.tsx tests/e2e/minimal-template.spec.ts tests/e2e/pdf-size.spec.ts
git diff --check
pdfinfo <downloaded-minimal.pdf>
python tests/pdf-inspect.py <downloaded-minimal.pdf>
pdftoppm -f <page> -l <page> -singlefile -scale-to 1000 -png <downloaded-minimal.pdf> <output-prefix>
```

Temporary Chromium 153 and matching SwiftShader are outside the application; no dependency/lockfile changes. Python inspector emits an existing Pillow deprecation warning, not an audit failure.

### Changed files and shared impact

- A: globals CSS import, new scoped minimal-template.css, CoverPreview branch, inert card/image classes in Education/Activity/CertificatePreview, TemplatePicker label, new Minimal tests and this report.
- B: Minimal-only social wrapping CSS + inert ProfilePreview row class, expanded Minimal tests, additive Minimal lock assertions in pdf-size tests, this report/sample screenshots, ARCHITECTURE/DESIGN_SYSTEM and partial M09.04 status in IMPLEMENTATION_PLAN.
- Preface/Profile use the original data-rendering JSX, with Minimal-scoped hierarchy/spacing rather than duplicate data/store components. Shared semantic classes do nothing outside Minimal. Paper/PaginatedSection/packPages/EditorSession/export pipeline are unchanged.
- No source fixes to Classic/Modern needed. Existing legacy fallback, save-failure behavior and dirty baselines retained.

## Remaining scope

Two colors per portfolio, TOC/overall page numbering, oversized-card splitting, image-count requirements and other Editor features remain separate. Unlimited PDF pages and same-Blob large-file confirmation are preserved, not reimplemented.

Not tested on physical phones or every browser; Chromium mocked data only. No live Supabase/Storage test, database suite, /my-data suite, migration/reset or real deletion. Real 14 MB fixture was not regenerated this round; confirmation/Blob identity/cleanup uses focused size mocks. Existing single-page preface/profile and oversized-card limits still rely on the unchanged overflow guard, not automatic splitting or shrinking. Do not mark all template/Editor requirements complete.

Final HEAD is the B commit containing this report (`git log -1 --format=%H -- docs/verification/MINIMAL_TEMPLATE_REVIEW.md`); exact B SHA and post-push local/remote tree verification are included in the handoff after publication. A commit cannot embed its own SHA without changing it. Part B publication must retain the tested full tree, expected parent A and non-force remote update.
