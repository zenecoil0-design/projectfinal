-- Prepared only; NOT applied to the hosted project in this round.
-- Live catalog reads timed out. Verify portfolios(id/user_id), grants, policies,
-- name collisions and Data API exposure in staging before installing this file.
-- No content backfill/deletion: absence of an override means visible=true.
BEGIN;

CREATE TABLE public.portfolio_section_visibility (
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('preface','toc','profile','education','activity','certificate')),
  visible boolean NOT NULL DEFAULT true,
  PRIMARY KEY (portfolio_id, section)
);

COMMENT ON TABLE public.portfolio_section_visibility IS
  'Per-portfolio section overrides. Missing row means visible. Cover is always visible and cannot have an override.';

ALTER TABLE public.portfolio_section_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_section_visibility FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.portfolio_section_visibility TO authenticated;

CREATE POLICY visibility_select_own ON public.portfolio_section_visibility
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = (SELECT auth.uid()))
);
CREATE POLICY visibility_insert_own ON public.portfolio_section_visibility
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = (SELECT auth.uid()))
);
CREATE POLICY visibility_update_own ON public.portfolio_section_visibility
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = (SELECT auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = (SELECT auth.uid()))
);

-- Target (portfolio_id, section) in each upsert; never replace a whole JSON map.
-- No new function/SECURITY DEFINER, changes to existing policies or port fields.
COMMIT;
