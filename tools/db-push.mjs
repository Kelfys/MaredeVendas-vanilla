/**
 * Aplica migrations via DATABASE_URL em .env.local (ou .env).
 * Uso: npm run db:push:url
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDatabaseUrl } from './db-connect.mjs'

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

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const directUrl = env.DATABASE_URL

if (!directUrl || directUrl.includes('[YOUR-PASSWORD]')) {
  console.error('Defina DATABASE_URL em .env.local com a senha do Postgres.')
  console.error('Dashboard: Settings → Database → Connection string (URI)')
  process.exit(1)
}

function buildPoolerSessionUrl(raw) {
  const base = parseDatabaseUrl(raw)
  const projectRef = base.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1]
  if (!projectRef) return null
  const password = encodeURIComponent(base.password)
  return `postgresql://${encodeURIComponent(`postgres.${projectRef}`)}:${password}@aws-1-us-west-2.pooler.supabase.com:5432/${base.database}`
}

const includeAll = process.argv.includes('--include-all')
const candidates = [
  env.DATABASE_POOLER_URL,
  buildPoolerSessionUrl(directUrl),
  directUrl,
].filter(Boolean)

let lastStatus = 1
for (const dbUrl of candidates) {
  const masked = dbUrl.replace(/:([^:@/]+)@/, ':***@')
  console.log(`Tentando supabase db push (${masked})...`)
  const args = ['supabase', 'db', 'push', '--db-url', dbUrl, '--yes']
  if (includeAll) args.push('--include-all')

  const result = spawnSync('npx', args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })

  if (result.status === 0) {
    process.exit(0)
  }
  lastStatus = result.status ?? 1
}

process.exit(lastStatus)