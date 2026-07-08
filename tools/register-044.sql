INSERT INTO supabase_migrations.schema_migrations(version, name)
SELECT '044', 'store_ads_approval_billing'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '044'
);