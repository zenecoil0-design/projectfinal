# Library tag-save follow-up — 2026-10-24

Base: b71f990006baa206e862732f1a3a50cc214d06e5.

Education and Certificate ignored errors returned by the DELETE of tag relations during Save. Removing every tag could therefore close the form as if Save succeeded while the previous tags remained. Both now check that error and preserve the existing failure/draft behavior; they also stop after that request if the component lifetime ended. Activity already checked the error and is included as a regression control.

Validation on final application source: production webpack build PASS; full-repository TypeScript PASS; scoped lint zero errors, four existing img warnings; diff check PASS. Three production/mock browser cases PASS in one final run (5.1 seconds): failed tag removal preserves the unselected draft and stored relation, followed by successful retry and empty stored relations. An earlier run passed two cases and timed out finding Activity's selected tag button (its name includes a checkmark); only that locator was corrected. An initial browser launch failed due to missing runtime graphics files, before assertions ran.

This is not atomic library Save: earlier content/image requests may have committed before a tag failure. It does not implement Storage cleanup, install migrations, or prove hosted RLS/API integration. Those remain open; no production data was changed. Dependencies were restored from the existing lockfile; browser runtime was installed outside the repository.
