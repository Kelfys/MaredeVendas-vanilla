-- Visibilidade pública exige loja aprovada com assinatura ativa

DROP POLICY IF EXISTS "Anyone can read approved stores" ON public.stores;
CREATE POLICY "Anyone can read approved stores" ON public.stores
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_admin()
    OR (
      status = 'approved'
      AND subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "Anyone can read active products of approved stores" ON public.products;
CREATE POLICY "Anyone can read active products of approved stores" ON public.products
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
    )
    OR (
      active = true
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_id
          AND s.status = 'approved'
          AND s.subscription_status IN ('active', 'trialing')
      )
    )
  );