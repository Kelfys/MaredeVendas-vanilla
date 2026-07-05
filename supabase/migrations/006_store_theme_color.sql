-- Cor de tema 8-bit para personalização da loja

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT 'pixel-blue';

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_theme_color_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_theme_color_check CHECK (
    theme_color IN (
      'pixel-red',
      'pixel-orange',
      'pixel-yellow',
      'pixel-green',
      'pixel-cyan',
      'pixel-blue',
      'pixel-purple',
      'pixel-pink'
    )
  );