import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CLIENT_ORIGIN,
  getBrowserOrigin,
} from '@/lib/utils/client-origin';

describe('getBrowserOrigin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns window.location.origin in the browser', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://preview.example.com' },
    });

    expect(getBrowserOrigin()).toBe('https://preview.example.com');
  });

  it('falls back when window.location is missing', () => {
    vi.stubGlobal('window', {});

    expect(getBrowserOrigin()).toBe(DEFAULT_CLIENT_ORIGIN);
  });

  it('falls back when location.origin is the string "null"', () => {
    vi.stubGlobal('window', {
      location: { origin: 'null' },
    });

    expect(getBrowserOrigin()).toBe(DEFAULT_CLIENT_ORIGIN);
  });

  it('uses a custom fallback when provided', () => {
    vi.stubGlobal('window', {});

    expect(getBrowserOrigin('https://custom.example')).toBe(
      'https://custom.example'
    );
  });
});
