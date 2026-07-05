-- Anúncios de lojistas no feed (24h após aprovação do admin)

DO $$ BEGIN
  CREATE TYPE store_ad_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.store_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 80),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 10 AND 280),
  image_url TEXT,
  status store_ad_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_ads_store_id ON public.store_ads(store_id);
CREATE INDEX IF NOT EXISTS idx_store_ads_status ON public.store_ads(status);
CREATE INDEX IF NOT EXISTS idx_store_ads_active ON public.store_ads(expires_at)
  WHERE status = 'approved';

ALTER TABLE public.store_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active store ads" ON public.store_ads;
CREATE POLICY "Public can read active store ads" ON public.store_ads
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
    OR (
      status = 'approved'
      AND expires_at IS NOT NULL
      AND expires_at > now()
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_id
          AND s.status = 'approved'
          AND s.subscription_status IN ('active', 'trialing')
      )
    )
  );

DROP POLICY IF EXISTS "Merchants can create store ads" ON public.store_ads;
CREATE POLICY "Merchants can create store ads" ON public.store_ads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id
        AND s.owner_id = auth.uid()
        AND s.status = 'approved'
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "Admin can update store ads" ON public.store_ads;
CREATE POLICY "Admin can update store ads" ON public.store_ads
  FOR UPDATE USING (public.is_admin());