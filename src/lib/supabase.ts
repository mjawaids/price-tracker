import { supabase as client, isSupabaseReady as ready } from './supabaseClient'

// Re-export with permissive typing to avoid type churn elsewhere
export const supabase: any = client as any
export const isSupabaseReady: boolean = ready