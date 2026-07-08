-- Aplicar no SQL Editor: https://supabase.com/dashboard/project/ulpjsxmilumqedkkfuqw/sql/new
-- Migrations 037 + 038 (Premium R$20, Starter→Plus, anúncios 2/mês)

-- 037: Remove Plus intermediário (R$ 15), renomeia Starter → Plus
ALTER TYPE public.subscription_plan_id RENAME VALUE 'plus' TO 'plus_legacy';

UPDATE public.stores
SET plan_id = 'premium'
WHERE plan_id = 'plus_legacy';

UPDATE public.plan_change_requests
SET requested_plan_id = 'premium'
WHERE requested_plan_id = 'plus_legacy';

UPDATE public.plan_change_requests
SET current_plan_id = 'premium'
WHERE current_plan_id = 'plus_legacy';

ALTER TYPE public.subscription_plan_id RENAME VALUE 'starter' TO 'plus';

-- 038: Premium — limite mensal de anúncios 4 → 2
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
    AND public.store_ads_created_this_month(store_id) < 2
  );