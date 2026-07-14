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

const triggers = await client.query(
  `SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_users_privileged_columns','trg_stores_privileged_columns') ORDER BY 1`,
)
const funcs = await client.query(
  `SELECT proname FROM pg_proc WHERE proname IN (
    'promote_self_to_merchant','save_user_password_for_admin',
    'enforce_users_privileged_columns','enforce_stores_privileged_columns'
  ) ORDER BY 1`,
)
const table = await client.query(`SELECT to_regclass('public.admin_user_passwords') AS t`)
const versions = await client.query(
  `SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('053','054','055') ORDER BY 1`,
)

console.log('triggers:', triggers.rows.map((r) => r.tgname).join(', ') || '(none)')
console.log('functions:', funcs.rows.map((r) => r.proname).join(', ') || '(none)')
console.log('admin_user_passwords:', table.rows[0].t)
console.log('registered:', versions.rows.map((r) => r.version).join(', ') || '(none)')
await client.end()
