import { describe, expect, it } from 'vitest';

import { isFetchNetworkError } from '@/lib/api/network-error';

describe('isFetchNetworkError', () => {
  it('detects Chromium failed-to-fetch TypeError', () => {
    expect(
      isFetchNetworkError(new TypeError('Failed to fetch (h4n.app)'))
    ).toBe(true);
  });

  it('detects Node.js undici fetch failed TypeError', () => {
    expect(isFetchNetworkError(new TypeError('fetch failed'))).toBe(true);
  });

  it('detects Safari load failed errors', () => {
    expect(isFetchNetworkError(new TypeError('Load failed'))).toBe(true);
  });

  it('detects nested cause chains from Supabase transport failures', () => {
    const cause = new TypeError('fetch failed');
    const error = new Error('Supabase request failed');
    (error as Error & { cause: Error }).cause = cause;

    expect(isFetchNetworkError(error)).toBe(true);
  });

  it('ignores unrelated TypeErrors', () => {
    expect(
      isFetchNetworkError(new TypeError('Cannot read properties of null'))
    ).toBe(false);
  });
});
