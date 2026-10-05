import { createClient } from '@supabase/supabase-js';

// The Supabase project is shared with other apps; all SpendLess tables live in
// their own schema. Every table query goes through this client, so pinning the
// schema here keeps SpendLess out of `public` (Storage and Auth are unaffected).
export const DB_SCHEMA = 'spendless';

const createSpendlessClient = (url: string, key: string) =>
  createClient(url, key, { db: { schema: DB_SCHEMA } });

export type SpendlessClient = ReturnType<typeof createSpendlessClient>;

const NOT_CONFIGURED = { message: 'Supabase not configured' };

// Minimal no-op stand-in so the app doesn't crash when Supabase isn't configured.
// Only the parts of the client the app calls are stubbed.
const createStub = (): SpendlessClient => {
  const noop = async () => ({ data: null, error: NOT_CONFIGURED });

  const queryBuilder = () => {
    const result = { data: null, error: NOT_CONFIGURED };
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'is', 'gt', 'gte', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle']) {
      chain[method] = () => chain;
    }
    chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    chain.catch = () => chain;
    return chain;
  };

  const stub = {
    auth: {
      getSession: noop,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: noop,
      signInWithPassword: noop,
      signInWithOAuth: noop,
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: noop,
      updateUser: noop,
    },
    from: () => queryBuilder(),
    storage: {
      from: () => ({
        upload: noop,
        remove: noop,
        list: noop,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
  return stub as unknown as SpendlessClient;
};

let client: SpendlessClient | null = null;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (url && key) {
  try {
    client = createSpendlessClient(new URL(url).toString(), key);
  } catch {
    console.error('[Supabase] Invalid VITE_SUPABASE_URL. Expected https://YOUR_PROJECT_ID.supabase.co');
  }
} else {
  console.info('[Supabase] Env missing. Public pages will load; data features disabled until configured.');
}

export const isSupabaseReady = client !== null;
export const supabase: SpendlessClient = client ?? createStub();
