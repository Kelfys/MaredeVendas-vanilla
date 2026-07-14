import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { connectionAttempts } from './db-connect.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return {}
  const vars = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    vars[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return vars
}

const dbUrl = { ...loadEnv('.env'), ...loadEnv('.env.local') }.DATABASE_URL
let client
for (const { label, config } of connectionAttempts(dbUrl)) {
  const c = new pg.Client(config)
  try {
    await c.connect()
    client = c
    console.log('via', label)
    break
  } catch (e) {
    console.warn(label, e.message)
    await c.end().catch(() => {})
  }
}
if (!client) process.exit(1)

const cols = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'store_ads'
  ORDER BY ordinal_position
`)
console.log('store_ads columns:')
for (const r of cols.rows) console.log(' ', r.column_name, r.data_type, r.column_default ?? '')

const tables = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'wishlist_items','store_ad_clicks','staff_action_log',
      'product_wishlists','flash_promos'
    )
  ORDER BY 1
`)
console.log('extra tables:', tables.rows.map((r) => r.table_name).join(', ') || '(none)')

const productCols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products'
    AND column_name LIKE '%flash%' OR (
      table_schema = 'public' AND table_name = 'products'
      AND column_name LIKE '%promo%'
    )
  ORDER BY 1
`)
console.log('product promo cols:', productCols.rows.map((r) => r.column_name).join(', '))

const reviews = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'reviews'
    AND column_name LIKE '%response%'
`)
console.log('review response cols:', reviews.rows.map((r) => r.column_name).join(', '))

const demos = await client.query(`
  SELECT slug, plan_id, name FROM public.stores
  WHERE slug ILIKE '%premium%' OR plan_id = 'premium' OR email IS NOT NULL
  ORDER BY plan_id, slug
  LIMIT 20
`).catch(() => ({ rows: [] }))
// stores has no email - fix
const demos2 = await client.query(`
  SELECT s.slug, s.plan_id, s.name, u.email
  FROM public.stores s
  LEFT JOIN public.users u ON u.id = s.owner_id
  WHERE s.plan_id = 'premium' OR u.email ILIKE '%premium%' OR u.email ILIKE '%demo%'
  ORDER BY s.plan_id, s.slug
  LIMIT 30
`)
console.log('premium/demo stores:')
for (const r of demos2.rows) console.log(' ', r.plan_id, r.slug, r.email)

await client.end()
