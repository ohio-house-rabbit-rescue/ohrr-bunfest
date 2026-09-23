import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)
export const isSupabaseConfigured = isConfigured

// Reads/writes the SAME Supabase project the OHRR app uses — so staff edits made
// here (or in the app) appear in both, instantly. The signed-in staff session
// authorizes writes; Row-Level Security enforces every permission.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)

// Turn a Supabase/PostgREST error (incl. RLS denials and RPC exceptions) into text.
export function errMessage(e: unknown): string {
  if (!e) return 'Something went wrong.'
  if (typeof e === 'string') return e
  const o = e as { message?: string; error_description?: string; details?: string }
  return o.message || o.error_description || o.details || 'Something went wrong.'
}
