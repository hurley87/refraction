import { describe, expect, it } from 'vitest';

import { getDiceEventPosterUrl } from '../get-poster';

describe('getDiceEventPosterUrl', () => {
  it('returns null for empty or missing images', () => {
    expect(getDiceEventPosterUrl(null)).toBeNull();
    expect(getDiceEventPosterUrl(undefined)).toBeNull();
    expect(getDiceEventPosterUrl([])).toBeNull();
  });

  it('prefers SQUARE image type', () => {
    const url = getDiceEventPosterUrl([
      { url: 'https://example.com/wide.jpg', type: 'WIDE' },
      { url: 'https://example.com/square.jpg', type: 'SQUARE' },
    ]);
    expect(url).toBe('https://example.com/square.jpg');
  });

  it('falls back to the first defined image', () => {
    const url = getDiceEventPosterUrl([
      { url: 'https://example.com/first.jpg', type: 'WIDE' },
      { url: 'https://example.com/second.jpg', type: 'PORTRAIT' },
    ]);
    expect(url).toBe('https://example.com/first.jpg');
  });

  it('skips undefined entries instead of throwing on .type', () => {
    const url = getDiceEventPosterUrl([
      undefined as unknown as { url: string; type?: string },
      { url: 'https://example.com/square.jpg', type: 'SQUARE' },
    ]);
    expect(url).toBe('https://example.com/square.jpg');
  });

  it('returns null when all entries are undefined', () => {
    const url = getDiceEventPosterUrl([
      undefined as unknown as { url: string; type?: string },
      null as unknown as { url: string; type?: string },
    ]);
    expect(url).toBeNull();
  });
});
