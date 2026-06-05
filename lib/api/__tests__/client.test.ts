import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@/lib/api/client';

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps fetch transport failures as ApiError status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch (h4n.app)'))
    );

    await expect(apiClient('/api/tiers')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'Network request failed',
    } satisfies Partial<ApiError>);
  });

  it('rethrows non-network fetch failures unchanged', async () => {
    const syntaxError = new SyntaxError('Unexpected token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(syntaxError));

    await expect(apiClient('/api/tiers')).rejects.toBe(syntaxError);
  });
});
