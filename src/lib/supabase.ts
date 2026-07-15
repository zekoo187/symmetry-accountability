import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when real Supabase credentials are present in .env. */
export const isSupabaseConfigured = Boolean(url && anon)

// A single shared client, only created when configured. The rest of the app
// checks `isSupabaseConfigured` before touching this.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anon as string)
  : null
