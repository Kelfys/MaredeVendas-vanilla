-- Cliente demo com e-mail confirmado para login em /conta/entrar
-- Idempotente: pode rodar mais de uma vez

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.seed_demo_customer(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT 'DemoCliente2026!',
  p_phone TEXT DEFAULT '21999990000',
  p_address TEXT DEFAULT 'Rua das Flores, 100 - Centro, Rio de Janeiro',
  p_delivery_period delivery_period DEFAULT 'tarde'
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
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      p_id,
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', p_name,
        'role', 'customer',
        'phone', p_phone,
        'address', p_address,
        'delivery_period', p_delivery_period::text
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    v_id := p_id;
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object(
        'name', p_name,
        'role', 'customer',
        'phone', p_phone,
        'address', p_address,
        'delivery_period', p_delivery_period::text
      ),
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.users (id, name, email, role, phone, address, delivery_period)
  VALUES (v_id, p_name, p_email, 'customer', p_phone, p_address, p_delivery_period)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'customer',
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    delivery_period = EXCLUDED.delivery_period;

  INSERT INTO public.admin_user_passwords (user_id, password)
  VALUES (v_id, p_password)
  ON CONFLICT (user_id) DO UPDATE SET
    password = EXCLUDED.password,
    updated_at = NOW();

  RETURN v_id;
END;
$$;

SELECT public.seed_demo_customer(
  '99999999-9999-4999-8999-999999999001',
  'cliente@maredevendas.com',
  'Cliente Demo'
);