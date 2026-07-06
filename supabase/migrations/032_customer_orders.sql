-- Pedidos vinculados ao cliente logado (histórico na dashboard)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);

DROP POLICY IF EXISTS "Store owners and staff can read orders" ON public.orders;
CREATE POLICY "Store owners and staff can read orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.is_staff()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Read order items with order access" ON public.order_items;
CREATE POLICY "Read order items with order access" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_id
        AND (s.owner_id = auth.uid() OR public.is_staff() OR o.user_id = auth.uid())
    )
  );