-- Planos de assinatura para lojistas
-- Idempotente: pode rodar mais de uma vez sem erro

DO $$ BEGIN
  CREATE TYPE subscription_plan_id AS ENUM ('free', 'starter', 'growth', 'premium');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS plan_id subscription_plan_id NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Lojas já aprovadas recebem assinatura ativa
UPDATE public.stores
SET
  subscription_status = 'active',
  approved_at = COALESCE(approved_at, created_at)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_stores_plan ON public.stores(plan_id);
CREATE INDEX IF NOT EXISTS idx_stores_subscription ON public.stores(subscription_status);