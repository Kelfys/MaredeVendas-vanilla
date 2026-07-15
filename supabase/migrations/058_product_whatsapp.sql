-- WhatsApp/contato opcional por produto (vitrine seed e casos especiais).
-- Se preenchido, o checkout usa este número em vez do whatsapp da loja.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

COMMENT ON COLUMN public.products.whatsapp IS
  'Contato WhatsApp deste item (só dígitos/com DDI). Null = usa stores.whatsapp. Usado na vitrine seed produtosfake@.';
