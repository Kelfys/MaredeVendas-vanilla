/**
 * Aplica migrations via DATABASE_URL em .env.local (ou .env).
 * Uso: npm run db:push:url
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
const dbUrl = env.DATABASE_URL

if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('Defina DATABASE_URL em .env.local com a senha do Postgres.')
  console.error('Dashboard: Settings → Database → Connection string (URI)')
  process.exit(1)
}

const includeAll = process.argv.includes('--include-all')
const args = ['supabase', 'db', 'push', '--db-url', dbUrl, '--yes']
if (includeAll) args.push('--include-all')

const result = spawnSync('npx', args, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)