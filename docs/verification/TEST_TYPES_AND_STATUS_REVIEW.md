# Test types and evidence-based status review

Follow-up: [section visibility](SECTION_VISIBILITY_REVIEW.md) now has an additive migration/local tests and UI/Preview/PDF checkpoint; that migration is not installed on the live target. Visibility-pending statements below describe this types/status round's historical boundary. Automatic empty-section rules, Autosave and other outstanding work are not claimed complete.

## Baseline and scope

- Date: 2026-10-20. Repository `zenecoil0-design/projectfinal`, branch `codex/portfolio-next-phase`.
- Starting local/remote HEAD: `e9c6c19abac1b415aac1ea3b80eb6d87b023da88`; working tree clean, fetched before editing. No newer work was discarded.
- Scope A: correct test result types without changing application behavior, SQL, assertions, fixtures, dependency versions or TypeScript strictness. Scope B: reconcile plan statuses with existing evidence, not implement new product features.
- Read AGENTS, package scripts, tsconfig, installed Next use-client guide and test setup before changing code. Current repository is authoritative; old attachments were not used to overwrite it.

## Part A — typed query results

Initial `npx tsc --noEmit --incremental false` failed with **9 TS2571 errors**, at cover-names 24/30, foundation 51/95/100/121, inspection/supabase-baseline 51 and reset 16/20. These are observed positions in the starting checkout, not assumed from the handoff.

Installed `@electric-sql/pglite` declares `query<T>(...): Promise<Results<T>>`. It cannot infer a row shape from arbitrary SQL text; these nine calls omitted T, so rows were unknown when reading a property. Existing deep equality/row count/error assertions were not the cause and remain unchanged.

| File / query projection | Row generic supplied | Reason |
| --- | --- | --- |
| cover-names: profile first_name, cover title | `{ first_name: string \| null }`, `{ title: string \| null }` | Test DDL adds nullable text columns; assertions still check the specific seeded strings |
| foundation: UPDATE RETURNING sort_order | `{ sort_order: number }` | Fixture defines non-null integer |
| foundation/reset: public.users email | `{ email: string }` | Fixture defines non-null text |
| foundation: has_table_privilege AS allowed | `{ allowed: boolean }` | Built-in function on existing fixture roles/tables returns boolean |
| foundation: pg_constraint confdeltype | `{ confdeltype: string }` | Catalog character code decoded as string; original rollback assertion remains `a` |
| inspection/reset: count(*)::int AS n | `{ n: number }` | Explicit int cast returns number, not uncast bigint/string |

No `any`, type assertions/cast chains, ignore directives, strictness/exclude edits, skipped tests, removed assertions or changed expected values. No shared helper needed for nine small projection shapes. Generic annotations are erased at runtime; runtime assertions still verify row counts, values, privileges and error cases.

### Safe execution and actual A results

All four files use `new PGlite()` with no dataDir/remote configuration, directly or through `tests/helpers/baseline.ts`. Each isolated in-memory fixture closes its database in finally. Reviewed the referenced reset/migration/inspection SQL: tests execute its contents only on these synthetic PGlite instances. No Supabase client, URL, CLI, real account or Storage API is used. The reset test name did not grant authority to reset a real system.

Commands actually run:

```sh
npx tsc --noEmit --incremental false
node --import tsx --test tests/cover-names.test.ts tests/foundation.test.ts tests/inspection/supabase-baseline.test.ts tests/reset.test.ts
npx eslint tests/cover-names.test.ts tests/foundation.test.ts tests/inspection/supabase-baseline.test.ts tests/reset.test.ts
git diff --check
```

After fixes: full-repository typecheck **PASS** (exit 0); related tests **12/12 PASS**, 0 skipped/cancelled (cover 1, foundation 6, inspection 3, reset 2); scoped ESLint **0 errors/0 warnings**; diff check PASS. npm emits its existing http-proxy configuration warning, unrelated to TS/lint. These results verify synthetic local fixtures, not live Supabase/RLS/Storage. No unsafe test was silently skipped. No `npm test` aggregate, maintenance CLI, live migration/reset, browser suite or PDF generation run.

## Part B — status reconciliation

Started only after A was published and fetched/verified at **`80a4f4588fa0e459268f21d315e579af1cef80ff`** (local and remote equal, clean working tree, complete tree equal to tested local checkpoint `40043b3`). Shell git lacks push credentials, so used configured GitHub connector, exact-tree verification and expected-parent non-force branch update. No commit/content was discarded or main changed.

### Method and status vocabulary

Read the plan and its directly linked reports, compared the actual components/loaders/store/export helpers, and separated original audit statements from later implementation. Relevant source inspected: three library components/useLibraryLoad/LibraryDraftGuard/my-data route; three selection forms/useEditorTags/tag-loader/save-selection; FormContainer/EditorSession/PreviewViewport; Minimal scoped styling/TemplatePicker; page-numbers/page-layout/ContentsPreview/PaginatedSection; export-pdf/ExportButton/LargePdfDialog. Source was read, not changed.

The plan already used PARTIAL in several rows without defining it. Added its explicit definition: an evidenced subset exists but the entire row is not complete; list what is done and what remains. Parent IN_PROGRESS means a started milestone with unfinished children, not authorization to implement all remaining features now. Normalize `DONE (mock)` to the defined `DONE` token and put the evidence boundary in its column. No percentage or expanded product requirement was introduced. Per-item TOC is not promoted from out-of-scope discussion to a new requirement.

### Parent status before/after

| Milestone(s) | Before | After | Evidence and remaining scope |
| --- | --- | --- | --- |
| M02 library | TODO | IN_PROGRESS | UI + resilience checkpoints exist; title-only fields/2 certificate images/version/atomic integration remain |
| M03 selection B | TODO | IN_PROGRESS | Selection UI/order/Tags retry exist; per-portfolio image selection/snapshots/version refresh remain |
| M05 portfolios/Autosave | TODO | IN_PROGRESS | Manual-save session/late-result/export guards exist; rename/copy/full management, Autosave/revision/conflict remain |
| M06 forms/Accordion | TODO | IN_PROGRESS | Six-form UI/Accordion/crop/draft checkpoints exist; age modes/visibility/empty-data rules and target extra headers remain |
| M07 responsive | TODO | IN_PROGRESS | Mock 390/1440, whole-A4 fit and stable-ID scroll exist; zoom/tablet/device/browser matrix/landing-page acceptance remain |
| M08 page model | TODO | IN_PROGRESS | Central numbering/section TOC/pre-export layout/no page limit exist; full blocks/visibility/splitting/multi-page TOC capability remain |
| M09 templates/colors | TODO | IN_PROGRESS | Minimal six categories and all-three-template TOC/PDF evidence exist; two-color contract/continuation/target assets remain |
| M10 PDF | TODO | IN_PROGRESS | Multi-page PDF/guards/progress/large-file confirmation evidence exists; revision model/quality acceptance/device work remain |
| M12 verification/delivery | TODO | IN_PROGRESS | Focused regressions and test-tooling checkpoints exist; staging/100 cases/real devices/final acceptance remain |
| M00 / M01 / M04 / M11 | BLOCKED / IN_PROGRESS / TODO / TODO | Unchanged | No proof that all M00 blockers or all data/auth milestones were resolved; no new integration performed |

### Child status before/after (all changed tokens)

| Task IDs | Before | After | Completed subset / evidence | Still not complete |
| --- | --- | --- | --- | --- |
| M02.01, .03 | TODO | PARTIAL | [Library UI](MY_DATA_UI_REVIEW.md), cards/forms/modal/image layout/CRUD mock | Target field semantics/validation and live/device integration |
| M02.04, .05 | TODO | PARTIAL | [Resilience](MY_DATA_RESILIENCE_REVIEW.md), main/Tags load error/retry and draft guard | RLS/API proof, Back/Forward, version/atomic save/upload/cleanup |
| M03.01, .02, .05 | TODO | PARTIAL | [Selection UI](LIBRARY_SELECTION_UI_REVIEW.md), [Editor Tags](EDITOR_TAG_LOADING_REVIEW.md), ordered-ID payload; local foundation assertions | B/version/backfill/selected assets and live integration |
| M05.04, .05 | TODO | PARTIAL | [Accordion](EDITOR_ACCORDION_REVIEW.md), [Tags](EDITOR_TAG_LOADING_REVIEW.md), [PDF session lock](PDF_LARGE_FILE_CONFIRMATION_REVIEW.md) | Autosave/offline/queue/revision/two-tab conflict and delete races |
| M06.01, .03, .05 | TODO | PARTIAL | UI/cover-name separation, six-panel Accordion, draft/crop/error handling | Complete target forms/age modes/visibility/omit rules/extra target headers |
| M07.02, .03, .04 | TODO | PARTIAL | [TOC navigation/scale](AUTOMATIC_TOC_REVIEW.md), mobile panels, fit | Zoom, hidden/absent section UX and physical-device matrix |
| M08.01, .02 | TODO | PARTIAL | [Numbering](CONTINUOUS_PAGE_NUMBERING_REVIEW.md), [TOC](AUTOMATIC_TOC_REVIEW.md), measurement portal and late-image flush | Full model/visibility/selected assets; split oversized text/cards |
| M09.01, .02, .03, .05 | TODO | PARTIAL | [Minimal/template switching](MINIMAL_TEMPLATE_REVIEW.md), all-three TOC/PDF/unknown-key fallback | Two-color/page-model contract and other target requirements |
| M09.04 | IN_PROGRESS | PARTIAL | Minimal presentation six categories + later numbering/TOC validated in prior rounds | Not actively implementing a new Minimal feature in this round; two colors/continuations/target image rules remain |
| M10.01, .02, .03, .05 | TODO | PARTIAL | [Page-limit PDF](PDF_PAGE_LIMIT_REVIEW.md), [large-file flow](PDF_LARGE_FILE_CONFIRMATION_REVIEW.md), [latest TOC PDFs](AUTOMATIC_TOC_REVIEW.md) | Saved revision, quality-floor acceptance, real Storage/device/resource evaluation |
| M10.04 | DONE (mock) | DONE | Normalize status token only; prior report has real 14,446,304-byte/32-page PDF + size/hash/Blob identity, with mock boundary/lifecycle data | Not a claim that all PDF/live integration/physical-phone requirements are complete |

M08.04/.05 and M12.01 stay PARTIAL; updated their evidence/text, not their completion status. M06.02/.04, M07.01/.05, M08.03, M02.02, M03.03/.04 and all other untouched task states remain as before. No entire previously TODO milestone was changed to DONE.

### Evidence boundaries and conflicts retained explicitly

- UI selection and /my-data reports describe completed presentation rounds, not the title-only field/validation changes or certificate two-image target. Current CertificateLibrary still declares MAX_IMAGES = 4. Image subset selection per portfolio is absent; the ordered-ID save payload has no selected assets/snapshot content.
- /my-data useLibraryLoad retains successful state and differentiates errors; LibraryDraftGuard covers cancel/close/category/existing guarded Link and beforeunload. Its report explicitly leaves App Router Back/Forward unguarded. Multi-request upload/save/cleanup is not transactional merely because a failed save retains draft.
- Editor useEditorTags retries metadata separately, reportTags is distinct from reportLoaded/markSaved, and saveSelection sends portfolio/section/ordered IDs without Tags. No evidence that the old Tags-read failure deleted Tags; no claim of such a write was added. Tags-only failure does not block ready main content PDF.
- Six-form Accordion remains manual-save, hidden/inert panels retain state. TOC is a generated Paper type, not a seventh form/readiness section. Source currently calculates age as an output from birthday; auto/manual age persistence remains unfinished.
- Numbering and TOC share actual Paper order and printed numbers, distinct from physical total. Measurement/flush and cleanup exist, but they are not a complete page/block/visibility model. Empty sections still follow current renderers. Oversized cards still hit the overflow guard rather than splitting.
- Minimal has six-category presentation and scoped tokens; switching/save-failure/reload/lock tests are recorded, but fixed template tokens are not two per-portfolio configurable colors. All-three-template PDF proofs are from mock data, not real student portfolios.
- M00 conflict: old inventory/registry entries say waiting for backup/live reset, whereas [M01 setup](../M01_DATABASE_SETUP.md) records the owner's historical waiver/reset/foundation results and cover save/reload. Added clear history labels and removed the misleading instruction to rerun those steps. Did **not** silently turn M00.04/.05 into PASS/DONE; current closure/backup-restore applicability/staging acceptance must be confirmed by Astra/owner. No old reset authorization was reused for new data.
- ARCHITECTURE now labels its old reference commit as historical, describes current FormContainer instead of unused SidebarMenu, includes education Tags, scoped load/draft guards, central TOC/numbering and real PDF flow. DESIGN_SYSTEM distinguishes target headers/visibility from implemented six-form Accordion and A4-only TOC.
- Added follow-up notes to directly linked UI/resilience/Accordion/Tags/PDF reports so old TS errors/Tags/10 MB/TOC limitations are historical rather than falsely current. Original test chronology/counts and Astra's independent review remain intact.

### Closing checks actually run in B

After documentation edits, reran the same full-repo `npx tsc --noEmit --incremental false`: **PASS** (exit 0). Reran the same four safe PGlite test files: **12/12 PASS**, 0 skipped/cancelled; scoped lint **0 errors/0 warnings**. A and B are two separate 12-test runs, not one 24-case suite. No browser/build/PDF rerun was warranted because only test type annotations and documents changed; previous production build results are not used as a substitute for this repository-wide typecheck.

Initial document diff check found nine newly introduced Markdown hard-break trailing spaces. Removed them and reran `git diff --check`: PASS. A Node filesystem check scanned relative Markdown file targets in all **10 edited documents: 125 links, 0 missing files** (including this completed report). External documentation URLs and every fragment target were not network/anchor validated, and no such remote validation is claimed.

All nine requested checkpoint areas were checked against source/report evidence; no feature implementation changed. Scope still pending: visibility/empty pages, Autosave/conflict, snapshots/library update, per-portfolio images/certificate 2-image target, two colors, oversized-content splitting/full page model, complete portfolio/password recovery, /my-data Back/Forward, staging/integration/100-case delivery/device acceptance.

## Publication

- Part A remote: `80a4f4588fa0e459268f21d315e579af1cef80ff`; fetched/compared exact tested content before starting B.
- Part B/final HEAD is the commit containing this completed report. Its exact remote SHA and clean-tree confirmation are in the final handoff after publication. Resolve with `git log -1 --format=%H -- docs/verification/TEST_TYPES_AND_STATUS_REVIEW.md`; embedding its own SHA would change it.
- Both parts use the configured GitHub connector when shell push credentials are unavailable, compare the complete tree against the tested local commit, update the branch with the expected parent and no force flag, then fetch and compare local/remote. This preserves newer work; a parent mismatch is a stop condition, not permission to overwrite.
- No application source, query/schema/RPC/RLS/auth/Storage policy, migration/maintenance SQL, dependency/lockfile, tsconfig, assertion/fixture or main changes. No live database/Storage action or real deletion. Work stops after B verification; no visibility/Autosave/other feature starts.
