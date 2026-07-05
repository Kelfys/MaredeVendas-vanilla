-- Garante que apenas brunopdaraujo@gmail.com seja admin ao cadastrar

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
  IF NEW.email = 'brunopdaraujo@gmail.com' THEN
    user_role_value := 'admin';
  ELSE
    user_role_value := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'customer'::user_role
    );
    IF user_role_value = 'admin' THEN
      user_role_value := 'customer';
    END IF;
  END IF;

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
    role = CASE
      WHEN EXCLUDED.email = 'brunopdaraujo@gmail.com' THEN 'admin'::user_role
      WHEN public.users.role = 'admin' AND EXCLUDED.email <> 'brunopdaraujo@gmail.com' THEN 'customer'::user_role
      ELSE EXCLUDED.role
    END,
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