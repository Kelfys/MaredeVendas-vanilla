-- Lojistas de teste: plano Gratuito e plano Plus (idempotente)

SELECT public.seed_demo_merchant(
  '11111111-1111-4111-8111-111111110901',
  'demo-gratuito@maredevendas.com',
  'Lojista Demo Gratuito'
);

SELECT public.seed_demo_merchant(
  '11111111-1111-4111-8111-111111110902',
  'demo-plus@maredevendas.com',
  'Lojista Demo Plus'
);

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
  'Conta de teste — plano Gratuito (2 itens, sem imagens).',
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
WHERE c.slug = 'alimentacao'
LIMIT 1
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'approved',
  plan_id = 'free',
  subscription_status = 'active',
  approved_at = COALESCE(public.stores.approved_at, NOW()),
  neighborhood_id = EXCLUDED.neighborhood_id,
  theme_color = EXCLUDED.theme_color;

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
  'Conta de teste — plano Plus (6 itens, 6 imagens).',
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
WHERE c.slug = 'moda'
LIMIT 1
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'approved',
  plan_id = 'plus',
  subscription_status = 'active',
  approved_at = COALESCE(public.stores.approved_at, NOW()),
  neighborhood_id = EXCLUDED.neighborhood_id,
  theme_color = EXCLUDED.theme_color;

SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220901', 'Arroz 1kg', 'Item teste plano Gratuito.', 5.90);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220901', 'Feijão 500g', 'Segundo item — limite Gratuito.', 4.50);

SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Camiseta Básica', 'Item teste plano Plus.', 49.90);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Calça Jeans', 'Segundo item Plus.', 129.00);
SELECT public.seed_demo_product('22222222-2222-4222-8222-222222220902', 'Tênis Casual', 'Terceiro item Plus.', 199.90);