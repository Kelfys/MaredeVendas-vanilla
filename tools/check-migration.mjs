import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'
import pg from 'pg'

dns.setDefaultResultOrder('ipv4first')
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
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

function parseDatabaseUrl(raw) {
  const match = String(raw).match(/^postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/)
  if (!match) throw new Error('DATABASE_URL inválida')
  const [host, port = '5432'] = match[3].split(':')
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host,
    port: Number(port),
    database: match[4],
  }
}

const version = process.argv[2] ?? '044'
const base = parseDatabaseUrl(loadEnvFile('.env.local').DATABASE_URL)
const projectRef = base.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? 'ulpjsxmilumqedkkfuqw'
const usePooler = process.argv.includes('--pooler')
const client = new pg.Client(usePooler ? {
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  user: `postgres.${projectRef}`,
  password: base.password,
  database: base.database,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
} : {
  ...base,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})

await client.connect()
const existing = await client.query(
  'SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = $1',
  [version],
)
console.log(existing.rows.length ? existing.rows : 'não registrada')
await client.end()