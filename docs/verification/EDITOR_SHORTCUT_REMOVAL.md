# Remove duplicate final-step shortcut — 27 October 2026

Removed only the blue top-toolbar final-step shortcut requested by the owner. The left form accordion entry `7. สีและดาวน์โหลด`, color editor, save action and PDF download remain unchanged. Template selection stays in the toolbar.

Adjusted existing tests to open the existing colors accordion with the idempotent `openEditorSection` helper. Production build and scoped lint passed; final production browser run passed 12/12 in 29.7s (manual age 5, palette 6, rename/content/PDF filename 1). Palette tests generated real PDFs for all three templates from hidden mobile Preview and verified page counts/A4. Backend data is synthetic. Inspected the desktop screenshot to confirm the top shortcut is absent. No database or dependency changes.
