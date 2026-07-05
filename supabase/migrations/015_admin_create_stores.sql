-- Admin pode criar lojas em nome de qualquer lojista

DROP POLICY IF EXISTS "Admin can create stores" ON public.stores;
CREATE POLICY "Admin can create stores" ON public.stores
  FOR INSERT WITH CHECK (public.is_admin());