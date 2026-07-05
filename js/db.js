import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

let client = null

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('xxxxxxxx'))
}

export function getSupabase() {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}

export async function requireClient() {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase não configurado. Edite js/config.js com URL e chave anon.')
  return sb
}