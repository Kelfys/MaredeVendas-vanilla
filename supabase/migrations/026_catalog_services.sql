-- Catálogo: produtos e serviços na mesma tabela (item_type).
-- Serviços não usam estoque (stock NULL).

DO $$ BEGIN
  CREATE TYPE catalog_item_type AS ENUM ('product', 'service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS item_type catalog_item_type NOT NULL DEFAULT 'product';

ALTER TABLE public.products
  ALTER COLUMN stock DROP NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_stock_check CHECK (stock IS NULL OR stock >= 0);

CREATE INDEX IF NOT EXISTS idx_products_item_type ON public.products(item_type);