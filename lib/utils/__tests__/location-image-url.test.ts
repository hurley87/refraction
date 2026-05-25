import { describe, it, expect } from 'vitest';
import {
  buildNextImageUrl,
  getLocationCardImageUrl,
  getLocationDrawerImageUrl,
  getLocationPinImageUrl,
  isOptimizableLocationImageUrl,
} from '../location-image-url';

const SUPABASE_URL =
  'https://abc123.supabase.co/storage/v1/object/public/images/uploads/foo.jpg';
const EXTERNAL_URL = 'https://example.com/photo.jpg';

describe('isOptimizableLocationImageUrl', () => {
  it('returns true for Supabase storage URLs', () => {
    expect(isOptimizableLocationImageUrl(SUPABASE_URL)).toBe(true);
  });

  it('returns false for non-Supabase hosts', () => {
    expect(isOptimizableLocationImageUrl(EXTERNAL_URL)).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isOptimizableLocationImageUrl('not-a-url')).toBe(false);
  });
});

describe('buildNextImageUrl', () => {
  it('builds a Next.js image optimizer URL', () => {
    const result = buildNextImageUrl(SUPABASE_URL, 56, 75);
    expect(result).toContain('/_next/image?');
    expect(result).toContain(encodeURIComponent(SUPABASE_URL));
    expect(result).toContain('w=56');
    expect(result).toContain('q=75');
  });
});

describe('getLocationPinImageUrl', () => {
  it('prefers thumb URL when provided', () => {
    expect(
      getLocationPinImageUrl(
        SUPABASE_URL,
        'https://abc123.supabase.co/thumb.webp'
      )
    ).toBe('https://abc123.supabase.co/thumb.webp');
  });

  it('returns full URL when no thumb (direct load for map pins)', () => {
    expect(getLocationPinImageUrl(SUPABASE_URL)).toBe(SUPABASE_URL);
  });

  it('returns raw URL for non-optimizable hosts', () => {
    expect(getLocationPinImageUrl(EXTERNAL_URL)).toBe(EXTERNAL_URL);
  });

  it('returns null for empty input', () => {
    expect(getLocationPinImageUrl(null)).toBeNull();
    expect(getLocationPinImageUrl(undefined)).toBeNull();
  });
});

describe('getLocationCardImageUrl', () => {
  it('returns optimized card-sized URL for Supabase', () => {
    const result = getLocationCardImageUrl(SUPABASE_URL);
    expect(result).toContain('w=720');
  });

  it('returns null for empty input', () => {
    expect(getLocationCardImageUrl(null)).toBeNull();
  });
});

describe('getLocationDrawerImageUrl', () => {
  it('returns optimized drawer-sized URL for Supabase', () => {
    const result = getLocationDrawerImageUrl(SUPABASE_URL);
    expect(result).toContain('w=288');
  });
});
