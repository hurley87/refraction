import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => {
  throw new Error('Server-only Supabase client imported by a client component');
});

describe('sponsored activation detail client modules', () => {
  it.each([
    ['./activation-launch-panel', 'ActivationLaunchPanel'],
    ['./page', 'default'],
  ] as const)(
    'does not import the server Supabase client from %s',
    async (modulePath, exportKey) => {
      await expect(import(modulePath)).resolves.toHaveProperty(exportKey);
    }
  );
});
