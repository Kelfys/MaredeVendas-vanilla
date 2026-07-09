-- Vencimento de assinatura para planos pagos (plus, premium)

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

UPDATE public.stores
SET subscription_expires_at = COALESCE(approved_at, created_at) + INTERVAL '30 days'
WHERE plan_id IN ('plus', 'premium')
  AND status = 'approved'
  AND subscription_expires_at IS NULL;

UPDATE public.stores
SET subscription_status = 'past_due'
WHERE plan_id IN ('plus', 'premium')
  AND status = 'approved'
  AND subscription_expires_at IS NOT NULL
  AND subscription_expires_at < NOW()
  AND subscription_status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS idx_stores_subscription_expires
  ON public.stores(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;