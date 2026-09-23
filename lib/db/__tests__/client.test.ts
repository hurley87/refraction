import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/lib/db/client');

const SUPABASE_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

describe('lib/db/client', () => {
  const envSnapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of SUPABASE_ENV_KEYS) {
      envSnapshot[key] = process.env[key];
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of SUPABASE_ENV_KEYS) {
      if (envSnapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    }
  });

  it('loads without throwing when Supabase env is missing', async () => {
    await expect(import('@/lib/db/client')).resolves.toBeDefined();
  });

  it('isSupabaseEnvConfigured is false when env is missing', async () => {
    const { isSupabaseEnvConfigured } = await import('@/lib/db/client');
    expect(isSupabaseEnvConfigured()).toBe(false);
  });

  it('throws a configuration error on use instead of supabaseUrl is required', async () => {
    const { supabase } = await import('@/lib/db/client');
    expect(() => supabase.from('players')).toThrow(
      /Supabase is not configured/i
    );
  });

  it('creates a client when env is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    vi.resetModules();

    const { supabase, isSupabaseEnvConfigured } =
      await import('@/lib/db/client');
    expect(isSupabaseEnvConfigured()).toBe(true);
    expect(supabase.from).toBeTypeOf('function');
  });
});
