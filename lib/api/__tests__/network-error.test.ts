import { describe, expect, it } from 'vitest';

import { isClientFetchNetworkError } from '@/lib/api/network-error';

describe('isClientFetchNetworkError', () => {
  it('detects Chromium failed-to-fetch TypeError', () => {
    expect(
      isClientFetchNetworkError(new TypeError('Failed to fetch (h4n.app)'))
    ).toBe(true);
  });

  it('detects Safari load failed errors', () => {
    expect(isClientFetchNetworkError(new TypeError('Load failed'))).toBe(true);
  });

  it('ignores unrelated TypeErrors', () => {
    expect(
      isClientFetchNetworkError(new TypeError('Cannot read properties of null'))
    ).toBe(false);
  });
});
