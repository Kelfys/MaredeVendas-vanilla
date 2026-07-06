-- Anúncios no feed: exclusivo plano Premium, até 4 por mês calendário

CREATE OR REPLACE FUNCTION public.store_ads_created_this_month(p_store_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.store_ads
  WHERE store_id = p_store_id
    AND created_at >= date_trunc('month', now());
$$;

DROP POLICY IF EXISTS "Merchants can create store ads" ON public.store_ads;
CREATE POLICY "Merchants can create store ads" ON public.store_ads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
        AND s.status = 'approved'
        AND s.subscription_status IN ('active', 'trialing')
        AND s.plan_id = 'premium'
    )
    AND public.store_ads_created_this_month(store_id) < 4
  );