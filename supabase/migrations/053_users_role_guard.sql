-- P0 C1: impede auto-escalada de papel em public.users
-- Não-admin não pode alterar role / flags de staff / neighborhood_id
-- Promoção customer → merchant só via RPC SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.enforce_users_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin pode tudo (promover moderador, etc.)
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'not allowed to change role'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.can_approve_plan_changes IS DISTINCT FROM OLD.can_approve_plan_changes THEN
    RAISE EXCEPTION 'not allowed to change plan approval permission'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.neighborhood_id IS DISTINCT FROM OLD.neighborhood_id THEN
    RAISE EXCEPTION 'not allowed to change neighborhood assignment'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_privileged_columns ON public.users;
CREATE TRIGGER trg_users_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_users_privileged_columns();

-- Cliente autenticado promove a si mesmo (somente customer → merchant)
CREATE OR REPLACE FUNCTION public.promote_self_to_merchant()
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.users;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET role = 'merchant'
  WHERE id = auth.uid()
    AND role = 'customer'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    SELECT * INTO result FROM public.users WHERE id = auth.uid();
    IF result.id IS NULL THEN
      RAISE EXCEPTION 'profile not found';
    END IF;
    IF result.role = 'merchant' THEN
      RETURN result;
    END IF;
    RAISE EXCEPTION 'only customers can become merchants'
      USING ERRCODE = '42501';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_self_to_merchant() TO authenticated;

COMMENT ON FUNCTION public.enforce_users_privileged_columns() IS
  'P0 C1: bloqueia UPDATE de role/flags por não-admin';
COMMENT ON FUNCTION public.promote_self_to_merchant() IS
  'P0 C1: RPC segura customer → merchant para o próprio usuário';
