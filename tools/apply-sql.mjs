/**
 * Executa um arquivo .sql via supabase db query usando DATABASE_URL (.env.local).
 * Uso: node tools/apply-sql.mjs supabase/migrations/044_store_ads_approval_billing.sql
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

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Uso: node tools/apply-sql.mjs <arquivo.sql>')
  process.exit(1)
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const dbUrl = env.DATABASE_URL
if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('Defina DATABASE_URL em .env.local')
  process.exit(1)
}

const sqlPath = resolve(root, sqlFile)
if (!existsSync(sqlPath)) {
  console.error(`Arquivo não encontrado: ${sqlPath}`)
  process.exit(1)
}

const result = spawnSync('npx', ['supabase', 'db', 'query', '--db-url', dbUrl, '-f', sqlPath], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) process.exit(result.status ?? 1)
console.log(`Aplicado: ${sqlFile}`)