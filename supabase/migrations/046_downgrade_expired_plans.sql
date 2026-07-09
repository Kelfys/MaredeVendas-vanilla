-- Plano pago vencido sem renovação: volta ao Gratuito e mantém só os 2 produtos mais recentes ativos.

WITH expired_stores AS (
  SELECT id
  FROM public.stores
  WHERE plan_id IN ('plus', 'premium')
    AND (
      (subscription_expires_at IS NOT NULL AND subscription_expires_at < NOW())
      OR subscription_status = 'past_due'
    )
),
downgraded AS (
  UPDATE public.stores
  SET
    plan_id = 'free',
    subscription_status = 'active',
    subscription_expires_at = NULL
  WHERE id IN (SELECT id FROM expired_stores)
  RETURNING id
),
ranked AS (
  SELECT
    p.id,
    ROW_NUMBER() OVER (PARTITION BY p.store_id ORDER BY p.created_at DESC) AS rn
  FROM public.products p
  WHERE p.store_id IN (SELECT id FROM downgraded)
)
UPDATE public.products
SET active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 2);