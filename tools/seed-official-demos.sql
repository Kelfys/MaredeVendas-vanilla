-- Re-seed das contas/lojas demo oficiais (README) — SEM lojas fake-*
-- Idempotente. Sem admin_user_passwords (removida na 055).
-- Aplicar: node tools/apply-sql.mjs tools/seed-official-demos.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Remove overloads antigas (assinaturas diferentes entre migrations)
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, delivery_period);
DROP FUNCTION IF EXISTS public.seed_demo_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, delivery_period, DATE);
DROP FUNCTION IF EXISTS public.seed_demo_admin(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_admin(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_moderator(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_moderator(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_moderator(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.seed_demo_merchant(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_merchant(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.seed_demo_product(UUID, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.seed_demo_product(UUID, TEXT, TEXT, NUMERIC, INTEGER);

-- Garante bairros base (Copacabana etc.)
INSERT INTO public.neighborhoods (id, name, slug, city, state)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'Copacabana', 'copacabana', 'Rio de Janeiro', 'RJ'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'Ipanema', 'ipanema', 'Rio de Janeiro', 'RJ'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'Leblon', 'leblon', 'Rio de Janeiro', 'RJ'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004', 'Centro', 'centro', 'Rio de Janeiro', 'RJ'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005', 'Tijuca', 'tijuca', 'Rio de Janeiro', 'RJ')
ON CONFLICT (slug) DO NOTHING;

-- Garante categorias do marketplace (produtos + serviços locais)
INSERT INTO public.categories (name, slug) VALUES
  ('Alimentação e Bebidas', 'alimentacao-bebidas'),
  ('Moda e Acessórios', 'moda-acessorios'),
  ('Saúde e Beleza', 'saude-beleza'),
  ('Casa e Decoração', 'casa-decoracao'),
  ('Pet', 'pet'),
  ('Eletrônicos e Informática', 'eletronicos-informatica'),
  ('Casa e Reformas', 'casa-reformas'),
  ('Manutenção e Assistência', 'manutencao-assistencia'),
  ('Limpeza e Domésticos', 'limpeza-domesticos'),
  ('Automotivo', 'automotivo'),
  ('Aulas e Serviços Locais', 'aulas-servicos-locais'),
  ('Outros', 'outros')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Funções de seed (sem vault de senha)
CREATE OR REPLACE FUNCTION public.seed_demo_customer(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'DemoCliente2026!',
  p_phone TEXT DEFAULT '21999990000',
  p_address TEXT DEFAULT 'Rua das Flores, 100 - Centro, Rio de Janeiro',
  p_delivery_period delivery_period DEFAULT 'tarde',
  p_birth_date DATE DEFAULT '1990-01-15'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      p_id, 'authenticated', 'authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', p_name, 'role', 'customer',
        'phone', p_phone, 'address', p_address,
        'delivery_period', p_delivery_period::text
      ),
      NOW(), NOW(), '', '', '', ''
    );
    v_id := p_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object(
        'name', p_name, 'role', 'customer',
        'phone', p_phone, 'address', p_address,
        'delivery_period', p_delivery_period::text
      ),
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.users (id, name, email, role, phone, address, delivery_period, birth_date)
  VALUES (v_id, p_name, p_email, 'customer', p_phone, p_address, p_delivery_period, p_birth_date)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'customer',
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    delivery_period = EXCLUDED.delivery_period,
    birth_date = EXCLUDED.birth_date;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_admin(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'MarecAdmin2026!'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      p_id, 'authenticated', 'authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name, 'role', 'admin'),
      NOW(), NOW(), '', '', '', ''
    );
    v_id := p_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', 'admin'),
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_id, p_name, p_email, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'admin';

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_moderator(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'DemoModerador2026!',
  p_neighborhood_id UUID DEFAULT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      p_id, 'authenticated', 'authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name, 'role', 'moderator'),
      NOW(), NOW(), '', '', '', ''
    );
    v_id := p_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', 'moderator'),
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.users (id, name, email, role, neighborhood_id)
  VALUES (v_id, p_name, p_email, 'moderator', p_neighborhood_id)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'moderator',
    neighborhood_id = EXCLUDED.neighborhood_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_merchant(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'DemoLojista2026!'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      p_id, 'authenticated', 'authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name, 'role', 'merchant'),
      NOW(), NOW(), '', '', '', ''
    );
    v_id := p_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', 'merchant'),
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_id, p_name, p_email, 'merchant')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'merchant';

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_product(
  p_store_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_stock INTEGER DEFAULT 20
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE store_id = p_store_id AND name = p_name
  ) THEN
    INSERT INTO public.products (store_id, name, description, price, stock, active, item_type)
    VALUES (p_store_id, p_name, p_description, p_price, p_stock, true, 'product');
  END IF;
END;
$$;

-- === Contas oficiais (README) ===
-- Seed via service/postgres: desliga guards P0 só nesta sessão de script
ALTER TABLE public.users DISABLE TRIGGER trg_users_privileged_columns;
ALTER TABLE public.stores DISABLE TRIGGER trg_stores_privileged_columns;

SELECT public.seed_demo_admin(
  '99999999-9999-4999-8999-999999999000'::uuid,
  'brunopdaraujo@gmail.com'::text,
  'Bruno Admin'::text,
  'MarecAdmin2026!'::text
);

SELECT public.seed_demo_customer(
  '99999999-9999-4999-8999-999999999001'::uuid,
  'cliente@maredevendas.com'::text,
  'Cliente Demo'::text
);

SELECT public.seed_demo_moderator(
  '99999999-9999-4999-8999-999999999002'::uuid,
  'moderador@maredevendas.com'::text,
  'Moderador Demo'::text,
  'DemoModerador2026!'::text,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'::uuid
);

SELECT public.seed_demo_merchant(
  '11111111-1111-4111-8111-111111110901'::uuid,
  'demo-gratuito@maredevendas.com'::text,
  'Lojista Demo Gratuito'::text
);

SELECT public.seed_demo_merchant(
  '11111111-1111-4111-8111-111111110902'::uuid,
  'demo-plus@maredevendas.com'::text,
  'Lojista Demo Plus'::text
);

SELECT public.seed_demo_merchant(
  '11111111-1111-4111-8111-111111110016'::uuid,
  'demo-pet-2@maredevendas.com'::text,
  'Bruno Animal'::text
);

-- Lojas oficiais
INSERT INTO public.stores (
  id, owner_id, name, slug, description, whatsapp,
  address, city, state, category_id, neighborhood_id, opening_hours,
  status, plan_id, subscription_status, approved_at, theme_color
)
SELECT
  '22222222-2222-4222-8222-222222220901',
  '11111111-1111-4111-8111-111111110901',
  'Loja Demo Gratuito',
  'loja-demo-gratuito',
  'Conta de teste — plano Gratuito (2 itens).',
  '5521975190901',
  'Rua Demo, 100',
  'Rio de Janeiro',
  'RJ',
  c.id,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
  'Seg–Sáb 8h–20h',
  'approved',
  'free',
  'active',
  NOW(),
  'pixel-green'
FROM public.categories c
WHERE c.slug = 'alimentacao-bebidas'
LIMIT 1
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'approved',
  plan_id = 'free',
  subscription_status = 'active',
  approved_at = COALESCE(public.stores.approved_at, NOW()),
  neighborhood_id = EXCLUDED.neighborhood_id,
  theme_color = EXCLUDED.theme_color,
  whatsapp = EXCLUDED.whatsapp,
  address = EXCLUDED.address;

INSERT INTO public.stores (
  id, owner_id, name, slug, description, whatsapp,
  address, city, state, category_id, neighborhood_id, opening_hours,
  status, plan_id, subscription_status, approved_at, theme_color
)
SELECT
  '22222222-2222-4222-8222-222222220902',
  '11111111-1111-4111-8111-111111110902',
  'Loja Demo Plus',
  'loja-demo-plus',
  'Conta de teste — plano Plus (6 itens).',
  '5521975190902',
  'Rua Demo, 200',
  'Rio de Janeiro',
  'RJ',
  c.id,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',
  'Seg–Sáb 8h–20h',
  'approved',
  'plus',
  'active',
  NOW(),
  'pixel-blue'
FROM public.categories c
WHERE c.slug = 'moda-acessorios'
LIMIT 1
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'approved',
  plan_id = 'plus',
  subscription_status = 'active',
  approved_at = COALESCE(public.stores.approved_at, NOW()),
  neighborhood_id = EXCLUDED.neighborhood_id,
  theme_color = EXCLUDED.theme_color,
  whatsapp = EXCLUDED.whatsapp,
  address = EXCLUDED.address;

INSERT INTO public.stores (
  id, owner_id, name, slug, description, whatsapp,
  address, city, state, category_id, neighborhood_id, opening_hours,
  status, plan_id, subscription_status, approved_at, theme_color
)
SELECT
  '22222222-2222-4222-8222-222222220016',
  '11111111-1111-4111-8111-111111110016',
  'Mundo Animal',
  'mundo-animal',
  'Banho, tosa e produtos para cães e gatos.',
  '5521975111116',
  'Rua das Flores, 100',
  'Niterói',
  'RJ',
  c.id,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
  'Seg–Sáb 8h–20h',
  'approved',
  'free',
  'active',
  NOW(),
  'pixel-yellow'
FROM public.categories c
WHERE c.slug = 'pet'
LIMIT 1
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'approved',
  plan_id = 'free',
  subscription_status = 'active',
  approved_at = COALESCE(public.stores.approved_at, NOW()),
  neighborhood_id = EXCLUDED.neighborhood_id,
  theme_color = EXCLUDED.theme_color,
  whatsapp = EXCLUDED.whatsapp,
  address = EXCLUDED.address;

-- Produtos demo
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220901', 'Arroz 1kg', 'Item teste plano Gratuito.', 5.90);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220901', 'Feijão 500g', 'Segundo item — limite Gratuito.', 4.50);

SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Camiseta Básica', 'Item teste plano Plus.', 49.90);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Calça Jeans', 'Segundo item Plus.', 129.00);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Tênis Casual', 'Terceiro item Plus.', 199.90);

SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220016', 'Banho e Tosa Pequeno Porte', 'Shampoo hipoalergênico.', 65.00);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220016', 'Areia Sanitária 4kg', 'Controle de odores.', 29.90);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220016', 'Arranhador para Gatos', 'Com bolinha.', 49.00);

ALTER TABLE public.users ENABLE TRIGGER trg_users_privileged_columns;
ALTER TABLE public.stores ENABLE TRIGGER trg_stores_privileged_columns;
