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

## Part B

Pending: visual desktop/mobile, long and mixed-orientation fixtures, actual PDF count/A4/render, affected production regression and final remote verification.

## Remaining scope

Two colors per portfolio, TOC/overall page numbering, oversized-card splitting, image-count requirements and other Editor features remain separate. Unlimited PDF pages and same-Blob large-file confirmation are preserved, not reimplemented.

Final HEAD is the B commit containing this report; actual A/B remote SHAs and verification will be recorded in the handoff. A commit cannot embed its own SHA without changing it.
