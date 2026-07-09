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
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

const dbUrl = loadEnv('.env.local').DATABASE_URL
let client
for (const { label, config } of connectionAttempts(dbUrl)) {
  const c = new pg.Client(config)
  try {
    await c.connect()
    client = c
    console.log('conectado via', label)
    break
  } catch (err) {
    console.warn(label, err.message)
    await c.end().catch(() => {})
  }
}
if (!client) throw new Error('sem conexão')

const { rows } = await client.query(`
  SELECT
    to_regclass('public.content_reports') AS content_reports,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'likes_adjustment'
    ) AS likes_adjustment,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_used'
    ) AS is_used,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'store_ads' AND column_name = 'is_extra'
    ) AS store_ads_extra,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'subscription_expires_at'
    ) AS subscription_expires_at,
    (
      SELECT count(*)::int FROM supabase_migrations.schema_migrations
      WHERE version IN ('041', '042', '043', '044', '045', '046')
    ) AS migrations_recent
`)
console.log(rows[0])
await client.end()