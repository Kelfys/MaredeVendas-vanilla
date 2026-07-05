-- Forma de pagamento escolhida no checkout do carrinho
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

COMMENT ON COLUMN public.orders.payment_method IS 'pix | cash | card | transfer — escolha do cliente no checkout';