import dns from 'node:dns'

dns.setDefaultResultOrder('ipv4first')

export function parseDatabaseUrl(raw) {
  const match = String(raw).match(/^postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/)
  if (!match) throw new Error('DATABASE_URL inválida')
  const [host, port = '5432'] = match[3].split(':')
  return {
    user: decodeURIComponent(match[1]),
    password: normalizePassword(decodeURIComponent(match[2])),
    host,
    port: Number(port),
    database: match[4],
  }
}

export function normalizePassword(password) {
  if (password.startsWith('[') && password.endsWith(']')) {
    return password.slice(1, -1)
  }
  return password
}

export function toPgConfig(raw, { pooler = false } = {}) {
  const base = parseDatabaseUrl(raw)
  if (!pooler) {
    return {
      ...base,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    }
  }
  const projectRef = base.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? 'ulpjsxmilumqedkkfuqw'
  return {
    host: 'aws-1-us-west-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: base.password,
    database: base.database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  }
}

export function connectionAttempts(raw) {
  return [
    { label: 'direct', config: toPgConfig(raw) },
    { label: 'pooler', config: toPgConfig(raw, { pooler: true }) },
  ]
}