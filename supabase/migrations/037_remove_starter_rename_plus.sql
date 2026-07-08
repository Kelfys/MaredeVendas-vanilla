-- Remove o tier Plus intermediário (R$ 15) e renomeia Starter → Plus (R$ 2,99).
-- Lojas no Plus antigo são migradas para Premium.

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