import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readSupabaseEnv(): { url: string; key: string } {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      '',
  };
}

const { url: supabaseUrl, key: supabaseServiceRoleKey } = readSupabaseEnv();

/** True when URL and key are non-empty (trimmed). */
export function isSupabaseEnvConfigured(): boolean {
  return Boolean(supabaseUrl.trim() && supabaseServiceRoleKey.trim());
}

if (
  typeof window === 'undefined' &&
  (!supabaseUrl.trim() || !supabaseServiceRoleKey.trim())
) {
  console.warn(
    '[lib/db/client] Supabase URL or key missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (anon key only if RLS allows the query).'
  );
}

let cachedSupabaseClient: SupabaseClient | undefined;

function getOrCreateSupabaseClient(): SupabaseClient {
  if (!isSupabaseEnvConfigured()) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return cachedSupabaseClient;
}

/**
 * Supabase client instance with service role permissions.
 * Use this for server-side operations that require elevated privileges.
 * Lazily initialized so importing this module does not throw when env is unset.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateSupabaseClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
