-- Storage buckets (plano gratuito Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('store-logos', 'store-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-banners', 'store-banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Leitura pública das imagens
CREATE POLICY "Imagens públicas - leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('store-logos', 'store-banners', 'product-images'));

-- Upload para usuários autenticados
CREATE POLICY "Imagens - upload autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('store-logos', 'store-banners', 'product-images')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Imagens - atualizar autenticado"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('store-logos', 'store-banners', 'product-images')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Imagens - deletar autenticado"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('store-logos', 'store-banners', 'product-images')
    AND auth.role() = 'authenticated'
  );

-- Permite criar perfil no login Google/OAuth
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());