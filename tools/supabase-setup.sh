#!/usr/bin/env bash
# Login interativo + link + push. Preferir db:push:url se já tiver DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "1/3 supabase login (browser/token)..."
npx --yes supabase login
echo "2/3 link project ulpjsxmilumqedkkfuqw..."
npx --yes supabase link --project-ref ulpjsxmilumqedkkfuqw
echo "3/3 db push..."
npx --yes supabase db push
echo "OK"
