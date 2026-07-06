-- Permite admin alterar email sem perder o papel de administrador

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
  delivery_value delivery_period;
  birth_value DATE;
BEGIN
  IF NEW.email = 'brunopdaraujo@gmail.com' THEN
    user_role_value := 'admin';
  ELSE
    user_role_value := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'customer'::user_role
    );
    IF user_role_value IN ('admin', 'moderator') THEN
      user_role_value := 'customer';
    END IF;
  END IF;

  delivery_value := NULL;
  IF NULLIF(NEW.raw_user_meta_data->>'delivery_period', '') IS NOT NULL THEN
    delivery_value := (NEW.raw_user_meta_data->>'delivery_period')::delivery_period;
  END IF;

  birth_value := NULL;
  IF NULLIF(NEW.raw_user_meta_data->>'birth_date', '') IS NOT NULL THEN
    birth_value := (NEW.raw_user_meta_data->>'birth_date')::date;
  END IF;

  INSERT INTO public.users (id, name, email, role, phone, address, delivery_period, birth_date)
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
    delivery_value,
    birth_value
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = CASE
      WHEN public.users.role = 'admin' THEN 'admin'::user_role
      WHEN EXCLUDED.email = 'brunopdaraujo@gmail.com' THEN 'admin'::user_role
      ELSE public.users.role
    END,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    delivery_period = EXCLUDED.delivery_period,
    birth_date = COALESCE(EXCLUDED.birth_date, public.users.birth_date);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.users
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_email_update();