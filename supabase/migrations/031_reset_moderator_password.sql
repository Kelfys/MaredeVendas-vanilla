-- Restaura senha do moderador demo (idempotente)
SELECT public.seed_demo_moderator(
  '99999999-9999-4999-8999-999999999002',
  'moderador@maredevendas.com',
  'Moderador Demo',
  'DemoModerador2026!'
);