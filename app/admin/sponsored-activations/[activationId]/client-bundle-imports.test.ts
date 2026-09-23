import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => {
  throw new Error('Server-only Supabase client imported by a client component');
});

describe('sponsored activation detail client modules', () => {
  it('does not import the server Supabase client from the launch panel', async () => {
    await expect(import('./activation-launch-panel')).resolves.toHaveProperty(
      'ActivationLaunchPanel'
    );
  });

  it('does not import the server Supabase client from the detail page', async () => {
    await expect(import('./page')).resolves.toHaveProperty('default');
  });
});
