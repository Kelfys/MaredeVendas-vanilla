-- Senhas visíveis apenas para admins (cadastro demo e novos usuários)
CREATE TABLE IF NOT EXISTS public.admin_user_passwords (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_user_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read user passwords"
  ON public.admin_user_passwords
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can store own password"
  ON public.admin_user_passwords
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admin can update password record"
  ON public.admin_user_passwords
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.save_user_password_for_admin(p_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  INSERT INTO public.admin_user_passwords (user_id, password)
  VALUES (auth.uid(), p_password)
  ON CONFLICT (user_id) DO UPDATE SET
    password = EXCLUDED.password,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_password_for_admin(TEXT) TO authenticated;

INSERT INTO public.admin_user_passwords (user_id, password)
SELECT u.id, v.password
FROM public.users u
JOIN (
  VALUES
    ('admin@admin.com', 'adminadmin'),
    ('brunopdearaujo@gmail.com', 'MarecAdmin2026!'),
    ('lojista@maredevendas.com', 'DemoLojista2026!'),
    ('joao@acougue.com', 'DemoLojista2026!')
) AS v(email, password) ON u.email = v.email
ON CONFLICT (user_id) DO UPDATE SET
  password = EXCLUDED.password,
  updated_at = now();