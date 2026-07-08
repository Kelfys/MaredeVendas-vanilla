-- Denúncias de lojas e produtos improprios (usuários → admin/moderador).

DO $$ BEGIN
  CREATE TYPE content_report_target AS ENUM ('store', 'product');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_report_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type public.content_report_target NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 1 AND char_length(reason) <= 80),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status public.content_report_status NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CHECK (
    (target_type = 'store' AND product_id IS NULL)
    OR (target_type = 'product' AND product_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_store ON public.content_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON public.content_reports(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_pending_store
  ON public.content_reports(reporter_id, store_id)
  WHERE target_type = 'store' AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_pending_product
  ON public.content_reports(reporter_id, product_id)
  WHERE target_type = 'product' AND status = 'pending';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit content reports" ON public.content_reports;
CREATE POLICY "Users can submit content reports" ON public.content_reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
    AND (
      target_type = 'store'
      OR NOT EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.stores s ON s.id = p.store_id
        WHERE p.id = product_id AND s.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Read content reports" ON public.content_reports;
CREATE POLICY "Read content reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.is_staff());

DROP POLICY IF EXISTS "Staff review content reports" ON public.content_reports;
CREATE POLICY "Staff review content reports" ON public.content_reports
  FOR UPDATE USING (public.is_staff());