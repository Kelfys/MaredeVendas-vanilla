-- Categorias do marketplace: produtos + serviços locais (bairro/cidade).
-- Lista alvo (12):
--   alimentacao-bebidas, moda-acessorios, saude-beleza, casa-decoracao, pet,
--   eletronicos-informatica, casa-reformas, manutencao-assistencia,
--   limpeza-domesticos, automotivo, aulas-servicos-locais, outros
--
-- Mapeamento legado → novo:
--   alimentacao, bebidas     → alimentacao-bebidas
--   moda                     → moda-acessorios
--   eletronicos              → eletronicos-informatica
--   pet-shop                 → pet
--   servicos                 → aulas-servicos-locais
--   saude-beleza             → saude-beleza (mantém)
--   casa-decoracao           → casa-decoracao (mantém)

-- 1) Renomeia categorias legadas (mesmo id — lojas/produtos já apontam certo)
UPDATE public.categories
SET name = 'Alimentação e Bebidas', slug = 'alimentacao-bebidas'
WHERE slug = 'alimentacao';

UPDATE public.categories
SET name = 'Moda e Acessórios', slug = 'moda-acessorios'
WHERE slug = 'moda';

UPDATE public.categories
SET name = 'Eletrônicos e Informática', slug = 'eletronicos-informatica'
WHERE slug = 'eletronicos';

UPDATE public.categories
SET name = 'Pet', slug = 'pet'
WHERE slug = 'pet-shop';

UPDATE public.categories
SET name = 'Aulas e Serviços Locais', slug = 'aulas-servicos-locais'
WHERE slug = 'servicos';

UPDATE public.categories
SET name = 'Saúde e Beleza'
WHERE slug = 'saude-beleza';

UPDATE public.categories
SET name = 'Casa e Decoração'
WHERE slug = 'casa-decoracao';

-- 2) Funde Bebidas em Alimentação e Bebidas
DO $$
DECLARE
  v_food UUID;
  v_drinks UUID;
BEGIN
  SELECT id INTO v_food FROM public.categories WHERE slug = 'alimentacao-bebidas' LIMIT 1;
  SELECT id INTO v_drinks FROM public.categories WHERE slug = 'bebidas' LIMIT 1;

  IF v_food IS NOT NULL AND v_drinks IS NOT NULL THEN
    UPDATE public.stores SET category_id = v_food WHERE category_id = v_drinks;
    UPDATE public.products SET category_id = v_food WHERE category_id = v_drinks;
    DELETE FROM public.categories WHERE id = v_drinks;
  END IF;
END $$;

-- 3) Garante as 12 categorias finais (idempotente)
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
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

-- 4) Qualquer slug legado residual (sem lojas/produtos) pode ser limpo depois no admin.
--    Não apaga categorias custom que o admin tenha criado com outros slugs.
