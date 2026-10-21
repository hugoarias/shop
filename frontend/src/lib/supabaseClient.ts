import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Sin credenciales en .env.local, la app arranca en modo demo con datos falsos (ver src/lib/mockBackend.ts). */
export const isMock = !supabaseUrl || !supabaseAnonKey

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
