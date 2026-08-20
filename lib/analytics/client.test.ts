import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveMixpanelPersistence } from '@/lib/analytics/client';

describe('resolveMixpanelPersistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers localStorage when storage is available', () => {
    expect(resolveMixpanelPersistence()).toBe('localStorage');
  });

  it('falls back to cookie when localStorage throws SecurityError (JAVASCRIPT-NEXTJS-1Q)', () => {
    const blockedStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }),
      removeItem: vi.fn(),
    };

    vi.stubGlobal('localStorage', blockedStorage);

    expect(resolveMixpanelPersistence()).toBe('cookie');
  });
});
