/**
 * Logo, banner e fotos de produto nas lojas demo oficiais.
 * Uso: node tools/seed-demo-images.mjs
 *      node tools/seed-demo-images.mjs --dry-run
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { connectionAttempts } from './db-connect.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

const DEMO_SLUGS = ['loja-demo-gratuito', 'loja-demo-plus', 'mundo-animal']

const STORE_MEDIA = {
  'loja-demo-gratuito': {
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop&q=80',
  },
  'loja-demo-plus': {
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=400&fit=crop&q=80',
  },
  'mundo-animal': {
    logo: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=400&fit=crop&q=80',
  },
}

const PRODUCT_IMAGES = [
  [/arroz/i, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop&q=80'],
  [/feij/i, 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&h=600&fit=crop&q=80'],
  [/camiseta/i, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&q=80'],
  [/cal[cç]a|jeans/i, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop&q=80'],
  [/t[eê]nis/i, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80'],
  [/banho|tosa/i, 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&h=600&fit=crop&q=80'],
  [/areia/i, 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&h=600&fit=crop&q=80'],
  [/arranhador|gato/i, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop&q=80'],
]

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80'

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

function pickProductImage(name, i) {
  for (const [re, url] of PRODUCT_IMAGES) {
    if (re.test(name)) return url
  }
  return FALLBACK
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MaredeVendas-demo-images/1.0' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`download ${res.status} ${url.slice(0, 60)}`)
  const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  const buf = Buffer.from(await res.arrayBuffer())
  let ext = 'jpg'
  if (contentType.includes('png')) ext = 'png'
  else if (contentType.includes('webp')) ext = 'webp'
  return {
    buf,
    contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg',
    ext,
  }
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') }
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulpjsxmilumqedkkfuqw.supabase.co'
const anonKey =
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_2hCOD3j1j7FRjLMsPF3sdw_4dG7A_HW'
const dbUrl = env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL ausente em .env.local')

let pgClient
for (const { label, config } of connectionAttempts(dbUrl)) {
  const c = new pg.Client(config)
  try {
    await c.connect()
    pgClient = c
    console.log('DB via', label)
    break
  } catch (e) {
    console.warn(label, e.message)
    await c.end().catch(() => {})
  }
}
if (!pgClient) throw new Error('sem conexão Postgres')

const { rows: stores } = await pgClient.query(
  `SELECT id, name, slug FROM public.stores WHERE slug = ANY($1::text[]) ORDER BY slug`,
  [DEMO_SLUGS],
)
console.log(`Lojas demo: ${stores.length}`)
if (stores.length === 0) {
  console.error('Nenhuma loja demo. Rode tools/seed-official-demos.sql antes.')
  process.exit(1)
}

const storage = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureAuth() {
  const attempts = [
    ['brunopdaraujo@gmail.com', 'MarecAdmin2026!'],
    ['demo-gratuito@maredevendas.com', 'DemoLojista2026!'],
    ['demo-plus@maredevendas.com', 'DemoLojista2026!'],
    ['cliente@maredevendas.com', 'DemoCliente2026!'],
  ]
  for (const [email, password] of attempts) {
    const { data, error } = await storage.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      console.log('auth upload:', data.user.email)
      return
    }
    console.warn('auth fail', email, error?.message)
  }
  throw new Error('Não autenticou para upload no Storage')
}

async function upload(bucket, path, buf, contentType) {
  const { error } = await storage.storage.from(bucket).upload(path, buf, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  })
  if (error) throw error
  return storage.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

if (!dryRun) await ensureAuth()

let ok = 0
let fail = 0

for (const store of stores) {
  const media = STORE_MEDIA[store.slug]
  if (!media) continue
  console.log(`\n=== ${store.name} (${store.slug}) ===`)

  // Logo
  try {
    console.log('→ logo')
    if (dryRun) {
      console.log('  [dry-run]', media.logo.slice(0, 70))
      ok++
    } else {
      const { buf, contentType, ext } = await downloadImage(media.logo)
      const url = await upload('store-logos', `${store.id}/logo.${ext}`, buf, contentType)
      await pgClient.query('UPDATE public.stores SET logo = $1 WHERE id = $2', [url, store.id])
      console.log('  OK logo')
      ok++
    }
  } catch (e) {
    console.error('  FAIL logo', e.message)
    fail++
  }

  // Banner
  try {
    console.log('→ banner')
    if (dryRun) {
      console.log('  [dry-run]', media.banner.slice(0, 70))
      ok++
    } else {
      const { buf, contentType, ext } = await downloadImage(media.banner)
      const url = await upload('store-banners', `${store.id}/banner.${ext}`, buf, contentType)
      await pgClient.query('UPDATE public.stores SET banner = $1 WHERE id = $2', [url, store.id])
      console.log('  OK banner')
      ok++
    }
  } catch (e) {
    console.error('  FAIL banner', e.message)
    fail++
  }

  const { rows: products } = await pgClient.query(
    `SELECT id, name FROM public.products WHERE store_id = $1 ORDER BY name`,
    [store.id],
  )

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const source = pickProductImage(p.name, i)
    console.log(`→ produto: ${p.name}`)
    try {
      if (dryRun) {
        console.log('  [dry-run]', source.slice(0, 70))
        ok++
        continue
      }
      let dl
      try {
        dl = await downloadImage(source)
      } catch {
        dl = await downloadImage(FALLBACK)
      }
      const path = `${store.id}/${p.id}.${dl.ext}`
      const url = await upload('product-images', path, dl.buf, dl.contentType)
      await pgClient.query('UPDATE public.products SET image = $1 WHERE id = $2', [url, p.id])
      console.log('  OK')
      ok++
    } catch (e) {
      console.error('  FAIL', e.message)
      fail++
    }
  }
}

console.log(`\nConcluído: ${ok} ok, ${fail} falha${dryRun ? ' (dry-run)' : ''}`)
await pgClient.end()
process.exit(fail ? 1 : 0)
