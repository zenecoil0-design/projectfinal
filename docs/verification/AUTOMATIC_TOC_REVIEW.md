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

## Part B

Pending regression expectation updates for one additional front-matter page, lifecycle/mobile/late-image checks, real PDFs across all templates, production build/regression and publication verification.

## Remaining work

Multi-page/per-item TOC, visibility, overall page model, autosave, two-color customization, oversized-card splitting and the rest of Editor/PDF are separate. No schema/query/RPC/RLS/auth/Storage, migration/reset, real deletion, dependency or main changes.

Final HEAD is the B commit containing this report (git log -1 --format=%H -- docs/verification/AUTOMATIC_TOC_REVIEW.md). Exact A/B remote SHAs and tested-tree verification are recorded in the handoff after publication; a commit cannot embed its own SHA without changing it.
