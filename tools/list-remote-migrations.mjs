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
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
  ORDER BY ordinal_position
`)
console.log('columns:', cols.rows.map((r) => r.column_name).join(', '))

const { rows } = await client.query(`
  SELECT * FROM supabase_migrations.schema_migrations
  ORDER BY version
`)
for (const r of rows) {
  console.log(JSON.stringify(r))
}
await client.end()
