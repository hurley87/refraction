import { describe, expect, it, vi } from 'vitest';
import { retrySupabaseNetworkOperation } from '../supabase-network-error';

describe('retrySupabaseNetworkOperation', () => {
  it('retries a transport failure and returns the next successful result', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce('ok');

    await expect(
      retrySupabaseNetworkOperation(operation, { delayMs: 0 })
    ).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws after transport retry attempts are exhausted', async () => {
    const error = new TypeError('fetch failed');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(
      retrySupabaseNetworkOperation(operation, {
        maxAttempts: 3,
        delayMs: 0,
      })
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry a database error', async () => {
    const error = { code: '42501', message: 'permission denied' };
    const operation = vi.fn().mockRejectedValue(error);

    await expect(
      retrySupabaseNetworkOperation(operation, { delayMs: 0 })
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
  });
});
