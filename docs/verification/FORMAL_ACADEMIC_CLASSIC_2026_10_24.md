# Formal Academic (Classic) implementation checkpoint — 24 Oct 2026

Repository: `zenecoil0-design/projectfinal`  
Branch: `codex/portfolio-next-phase`  
Initial head this round: `b6a869bdf83eb406707f4e5a1c2662405d9dc607`  
Source/test head: `d47f8d34f5712b64a4faa8ba4dabbd57ba886b47`

## User-approved visual brief

Reference: user-uploaded nine-page `แบบ 1 แบบทางการ.pdf`, following an iterative visual approval. The approved direction is academic, white/navy/light gray, clean, thin borders, no gold/laurel decorations. Classic cover has **one** circular user photo, prominent `PORTFOLIO` title and name/school below. Preserve original overall placement rather than redesigning form fields; other two templates remain unchanged. Activities may have 0–4 images, certificates 0–2. Keep A4 Preview/PDF consistent, include all selected entries, do not clip overflow, do not change Supabase schema.

## Published increments

1. Already existing: `b6a869bdf83eb406707f4e5a1c2662405d9dc607` created one-photo formal cover and a dedicated `src/app/formal-template.css` imported from global stylesheet.
2. `b3a1c30e7ad993c30c2589d9a2a36e5c7a7d0a7f`: Added scoped Classic styles for white/navy/light-gray inner-page typography, TOC/preface, profile grouped table-like sections, education rows and activity/certificate cards. Kept existing DOM/DB/form behavior. Card styles are applied on `[data-template=classic]` to include offscreen measurement trees as well as live Preview/PDF.
3. `4bd1f42d9554eee56111fdc1f144ddb5f74c809d`: Added `data-image-count` to image grids to support Classic-specific one/two/three/four-image geometry and retained compatibility cover image alt text. No images removed, no changes to image upload/selection data.
4. `d47f8d34f5712b64a4faa8ba4dabbd57ba886b47`: Added `tests/e2e/formal-classic.spec.ts` with regression cases for a single Classic cover image, template isolation, A4 sheet presence, number marker and image-count attributes.

## Static verification

Remote branch and file reads: **PASS**, 3 commits ahead of initial head, no rewinds. Verified Classic cover contains exactly one `img` in its branch; image count attributes present; style rules target `classic`; E2E spec saved remotely. `modern` and `minimal` JSX branches left intact. No changes to any form, store or Supabase schema and no modification to `main`.

**NOT RUN / NOT YET ACCEPTED:** `npm ci`, `npm run build`, TypeScript, ESLint, Playwright, screenshot comparison at A4, real exported PDF and long-content/multiple-page overflow. This environment could read/write GitHub via connector but cannot clone GitHub over git network (DNS failure), so the target checkout/dependencies/test app were not available. **Do not consider UI fidelity, pagination or export parity tested/passed.**

## Test instructions in a safe checkout

```bash
git fetch origin
git switch codex/portfolio-next-phase
git pull --ff-only origin codex/portfolio-next-phase
npm ci
npm run build
npx tsc --noEmit --incremental false
npm run lint
npm test
npx playwright test tests/e2e/formal-classic.spec.ts tests/e2e/editor.spec.ts tests/e2e/minimal-template.spec.ts tests/e2e/page-numbering.spec.ts tests/e2e/pdf-export.spec.ts --reporter=line
```

Inspect Classic against user's PDF pages 1–9 at A4. Test no image, 1, 2, 3 and 4 activity images, 0–2 certificate images, short and very long text, several extra section pages, TOC physical page numbers and actual exported PDF including whether any card exceeds remaining-page space. Confirm PDF matches Preview and other templates are unaffected.

## Unresolved acceptance risks for Astra / next implementation round

- CSS visual approximation was based on approved mockup and PDF, but no real-browser screenshot or export comparison could be run here; exact position sizes and any clipping need inspection and iteration.
- Current paginator packs **whole cards** by measured height in an 840px budget; a **single oversized card** cannot automatically split internally and must not be silently claimed to satisfy the user's no-clipping requirement. Long preface/profile text also needs explicit overflow policy. These may require cross-cutting pagination architecture and are reserved for the higher-complexity owner Astra.
- Current cover formal layout must be checked with long Thai title, long school name and varied cropped portrait ratios; accessibility and PDF export should be exercised.
- The profile is styled to resemble categorized table groups while retaining the current data and three DOM root sections; it is **not** a guaranteed pixel-exact rebuild of the user's Canva row-by-row grid.
- Supabase integration and legacy data protection are out of scope.

Do not deploy, merge to main, or claim production acceptance until above checks pass.
