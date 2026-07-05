ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.products
SET price_changed_at = created_at
WHERE price_changed_at IS NULL;