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

Pending: async image/layout, hidden mobile Preview, actual PDFs/printed numbers across all templates, affected production regression, final documentation and remote verification.

## Remaining scope

TOC, visibility, overall page model, card splitting, two-color customization and remaining PDF/Editor features are not completed by this task. Existing overflow/image-error guards and large-file same-Blob confirmation remain required.

All browser data is mocked, not live Supabase/Storage. No database suite, migration/reset or real deletion. Final HEAD is the Part B commit containing this report; exact remote SHAs/verification are also included in the handoff after publication.
