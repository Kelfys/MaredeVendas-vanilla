-- Ajuste manual de curtidas por admin (soma ao total real de product_likes).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS likes_adjustment INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_likes_adjustment_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_likes_adjustment_check CHECK (likes_adjustment >= -100000);