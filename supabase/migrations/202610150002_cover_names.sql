-- Apply after foundation. Names belong to the cover; profile edits stay separate.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.covers ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.covers ADD COLUMN IF NOT EXISTS last_name text;

-- Preserve the names that existing covers previously displayed from profiles.
-- NULL marks uninitialized columns; an intentionally cleared name stays cleared on rerun.
UPDATE public.covers c
SET first_name = coalesce(c.first_name, p.first_name, ''),
    last_name = coalesce(c.last_name, p.last_name, '')
FROM public.profiles p
WHERE p.portfolio_id = c.portfolio_id
  AND (c.first_name IS NULL OR c.last_name IS NULL);
UPDATE public.covers
SET first_name = coalesce(first_name, ''), last_name = coalesce(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;
ALTER TABLE public.covers ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.covers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.covers ALTER COLUMN last_name SET DEFAULT '';
ALTER TABLE public.covers ALTER COLUMN last_name SET NOT NULL;
NOTIFY pgrst, 'reload schema';
COMMIT;
