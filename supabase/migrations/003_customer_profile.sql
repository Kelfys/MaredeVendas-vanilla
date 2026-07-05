-- Perfil do cliente: telefone, endereço e horário de entrega
-- Idempotente: pode rodar mais de uma vez sem erro

DO $$ BEGIN
  CREATE TYPE delivery_period AS ENUM ('manha', 'tarde', 'noite', 'madrugada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_period delivery_period;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, phone, address, delivery_period)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    NULLIF(NEW.raw_user_meta_data->>'delivery_period', '')::delivery_period
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;