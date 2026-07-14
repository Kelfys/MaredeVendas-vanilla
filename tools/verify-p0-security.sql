SELECT tgname FROM pg_trigger WHERE tgname IN (''trg_users_privileged_columns'',''trg_stores_privileged_columns'');
SELECT proname FROM pg_proc WHERE proname IN (''promote_self_to_merchant'',''save_user_password_for_admin'');
SELECT to_regclass(''public.admin_user_passwords'') AS password_table;
