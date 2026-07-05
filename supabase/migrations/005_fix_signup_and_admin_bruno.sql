-- Corrige trigger de cadastro e promove admin Bruno
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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
  delivery_value delivery_period;
BEGIN
  user_role_value := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
    'customer'::user_role
  );

  delivery_value := NULL;
  IF NULLIF(NEW.raw_user_meta_data->>'delivery_period', '') IS NOT NULL THEN
    delivery_value := (NEW.raw_user_meta_data->>'delivery_period')::delivery_period;
  END IF;

  INSERT INTO public.users (id, name, email, role, phone, address, delivery_period)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    user_role_value,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    delivery_value
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    delivery_period = EXCLUDED.delivery_period;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Após criar o usuário no Auth (signup ou dashboard), garante role admin:
UPDATE public.users
SET role = 'admin'
WHERE email = 'brunopdearaujo@gmail.com';