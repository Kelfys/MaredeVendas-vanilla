-- Aplicar no SQL Editor: https://supabase.com/dashboard/project/ulpjsxmilumqedkkfuqw/sql/new
-- Migration 043: tag Usado no catálogo

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_used ON public.products(is_used) WHERE is_used = true;