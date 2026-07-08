/** Registra versão aplicada manualmente em supabase_migrations.schema_migrations */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { connectionAttempts } from './db-connect.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return {}
  const vars = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

const version = process.argv[2]
const name = process.argv[3]
if (!version || !name) {
  console.error('Uso: node tools/register-migration.mjs <versão> <nome>')
  process.exit(1)
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const dbUrl = env.DATABASE_POOLER_URL || env.DATABASE_URL
if (!dbUrl) {
  console.error('Defina DATABASE_URL em .env.local')
  process.exit(1)
}

let lastError = null
for (const { label, config } of connectionAttempts(dbUrl)) {
  const client = new pg.Client(config)
  try {
    await client.connect()
    const existing = await client.query(
      'SELECT version FROM supabase_migrations.schema_migrations WHERE version = $1',
      [version],
    )
    if (existing.rowCount > 0) {
      console.log(`Migration ${version} já registrada`)
      process.exit(0)
    }
    await client.query(
      'INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES ($1, $2)',
      [version, name],
    )
    console.log(`Registrada migration ${version} (${name}) via ${label}`)
    process.exit(0)
  } catch (err) {
    lastError = err
    console.warn(`${label}: ${err.message}`)
  } finally {
    await client.end().catch(() => {})
  }
}

console.error(`Falha ao registrar: ${lastError?.message ?? 'sem conexão'}`)
console.error('Alternativa: SQL Editor → tools/register-044.sql')
process.exit(1)