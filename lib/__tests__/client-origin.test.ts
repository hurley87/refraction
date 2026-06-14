import { afterEach, describe, expect, it } from 'vitest';

import { getClientOrigin } from '@/lib/client-origin';
import { PRODUCTION_METADATA_ORIGIN } from '@/lib/metadata/request-base';

describe('getClientOrigin', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('returns window.location.origin in the browser', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://preview.example.com' },
    });

    expect(getClientOrigin()).toBe('https://preview.example.com');
  });

  it('falls back when window.location is undefined', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: undefined,
    });

    expect(getClientOrigin()).toBe(PRODUCTION_METADATA_ORIGIN);
  });

  it('uses a custom fallback when provided', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: undefined,
    });

    expect(getClientOrigin('https://custom.example')).toBe(
      'https://custom.example'
    );
  });
});
