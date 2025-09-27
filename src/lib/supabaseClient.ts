import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let isSupabaseReady = false;
export let supabase: SupabaseClient | any = null;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (url && key) {
  try {
    const parsed = new URL(url);
    supabase = createClient(parsed.toString(), key);
    isSupabaseReady = true;
  } catch {
    console.error('[Supabase] Invalid VITE_SUPABASE_URL. Expected https://YOUR_PROJECT_ID.supabase.co');
  }
} else {
  console.info('[Supabase] Env missing. Public pages will load; data features disabled until configured.');

  // Minimal no-op stub to prevent runtime crashes when supabase is not configured
  const noop = async () => ({ data: null, error: { message: 'Supabase not configured' } });
  const noopSync = () => ({ data: null, error: { message: 'Supabase not configured' } });

  const queryBuilder = () => {
    const chain = {
      select: (_: any) => chain,
      insert: (_: any) => chain,
      update: (_: any) => chain,
      delete: () => chain,
      eq: (_: any, __: any) => chain,
      order: (_: any, __?: any) => chain,
      single: () => chain,
      then: (resolve: any) => resolve({ data: null, error: { message: 'Supabase not configured' } }),
      catch: (_: any) => chain,
    } as any;
    return chain;
  };

  supabase = {
    auth: {
      getSession: noop,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: noop,
      signInWithPassword: noop,
      signOut: async () => {},
      resetPasswordForEmail: noop,
      updateUser: noop,
    },
    from: (_table: string) => queryBuilder(),
  } as any;
}
