# Legacy image fit — 28 October 2026

Base: c85dfdfb8b20cc180867f488fcd8c267f4e7078c. Branch: codex/portfolio-next-phase.

Minimal previously stacked legacy certificate groups of three/four images vertically. These groups now use two columns, preserving every image and contain sizing. New certificate uploads remain limited to two. This is a bounded layout fix, not arbitrary image-group pagination.

Validation: production build PASS; full TypeScript PASS; scoped test ESLint PASS; diff check PASS. Production browser tests 8/8 PASS in 34.2s: three long-text/four-image cases across templates plus five optional-field/image regressions. Backend data is synthetic, Chromium viewport is emulated.

Real downloaded PDFs: Classic 18 pages / 6,641,427 bytes; Modern 17 / 6,400,457; Minimal 18 / 6,108,587. Each matches Preview and every page is A4. Viewed Minimal certificate page 14 and continuation page 15: all four images appear together, text and footer fit. Existing mixed-image regression checks distinct image order and missing-image export rejection.

No schema, Storage, save payload or PDF quality changes. No main update. Arbitrary image counts outside the supported current/legacy limits still rely on overflow validation; this report does not claim all project acceptance or real-device testing is complete.
