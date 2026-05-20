import { createClient } from '@supabase/supabase-js';

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

/**
 * Supabase client instance with service role permissions.
 * Use this for server-side operations that require elevated privileges.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
