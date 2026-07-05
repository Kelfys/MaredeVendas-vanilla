-- Apenas brunopdaraujo@gmail.com como administrador

UPDATE public.users
SET role = 'customer'
WHERE role = 'admin'
  AND email <> 'brunopdaraujo@gmail.com';

UPDATE public.users
SET role = 'admin'
WHERE email = 'brunopdaraujo@gmail.com';

DELETE FROM public.admin_user_passwords
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email = 'admin@admin.com'
);