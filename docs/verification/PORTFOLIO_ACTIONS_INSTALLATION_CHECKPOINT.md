# Portfolio actions installation checkpoint — 26 October 2026

This supplements earlier preparation reports; their NOT_RUN statements remain historical.

## Verified
- Owner supplied a real isolated Docker PostgreSQL/PostgREST result from commit 2262c608bad8b523107eb5987c3ad605de008a31: 8/8 PASS, exit 0. The assistant did not execute that run.
- Read-only hosted review confirmed required columns/defaults, ten cascading foreign keys, relevant constraints and timestamp triggers; actions objects were absent before installation.
- After explicit approval, the exact repository migration supabase/migrations/20261024131223_portfolio_actions.sql was applied successfully and migration history checked. Do not replay it based on the local filename timestamp.
- Post-install metadata: receipt RLS enabled, authenticated owner-only SELECT; direct INSERT/UPDATE/DELETE denied; anon SELECT and RPC EXECUTE denied; authenticated RPC EXECUTE allowed. RPC search_path is empty.
- Advisor flags the intentionally authenticated SECURITY DEFINER RPC. Ownership is checked internally; this is not a claim that all advisor findings are cleared.
- No user portfolios or Storage files were created/deleted in these installation checks.

## Pending hosted acceptance
The Dashboard flag remains off by default. Metadata and synthetic Docker tests do not replace a signed-in hosted workflow. Use a designated local acceptance app and disposable test portfolio.

In the app checkout with existing working hosted configuration, add NEXT_PUBLIC_PORTFOLIO_ACTIONS_ENABLED=true to the untracked .env.local, preserving existing values. Restart npm run dev. For production, rebuild with the flag before npm start; restarting an old build alone is insufficient. Never commit credentials.

1. Save distinct content, library selections/order, template, three colors and a hidden section in a disposable test portfolio.
2. On Dashboard use the duplicate icon on that portfolio card and give the copy a distinct name.
3. Compare copy content/images/order/template/colors/visibility with source.
4. Edit copy-specific text, save and reopen source; source text must remain unchanged. Library content remains shared by design.
5. Cancel deletion once, then delete only the disposable copy. Reload and confirm source and library items remain.
6. If uncertain, preserve browser storage and verify the pending receipt first; do not bypass it with a new operation.

Record sanitized results. Hosted cross-owner acceptance requires two authorized accounts; no hosted browser mutation acceptance is claimed yet. The panel needs browser Web Locks and crypto APIs (use localhost or HTTPS). Do not mark overall portfolio management complete until acceptance is recorded.
