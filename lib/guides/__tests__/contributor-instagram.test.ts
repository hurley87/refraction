import { describe, it, expect } from 'vitest';
import {
  normalizeContributorInstagramForDb,
  resolveContributorInstagramProfileUrl,
} from '@/lib/guides/contributor-instagram';

describe('normalizeContributorInstagramForDb', () => {
  it('returns null for empty', () => {
    expect(normalizeContributorInstagramForDb('')).toBeNull();
    expect(normalizeContributorInstagramForDb('   ')).toBeNull();
    expect(normalizeContributorInstagramForDb(null)).toBeNull();
  });

  it('stores @handle from bare username', () => {
    expect(normalizeContributorInstagramForDb('grahamdouglasbertie')).toBe(
      '@grahamdouglasbertie'
    );
  });

  it('stores single @ from input with @', () => {
    expect(normalizeContributorInstagramForDb('@user')).toBe('@user');
    expect(normalizeContributorInstagramForDb('@@user')).toBe('@user');
  });

  it('reduces instagram.com profile URL to @handle', () => {
    expect(
      normalizeContributorInstagramForDb(
        'https://www.instagram.com/grahamdouglasbertie/'
      )
    ).toBe('@grahamdouglasbertie');
  });

  it('keeps non-instagram URLs as-is', () => {
    expect(normalizeContributorInstagramForDb('https://example.com/x')).toBe(
      'https://example.com/x'
    );
  });

  it('keeps instagram post URLs as-is', () => {
    const url = 'https://www.instagram.com/p/ABC123/';
    expect(normalizeContributorInstagramForDb(url)).toBe(url);
  });
});

describe('resolveContributorInstagramProfileUrl', () => {
  it('returns empty for missing', () => {
    expect(resolveContributorInstagramProfileUrl('')).toBe('');
    expect(resolveContributorInstagramProfileUrl(null)).toBe('');
  });

  it('passes through http(s) URLs', () => {
    const u = 'https://www.instagram.com/foo/';
    expect(resolveContributorInstagramProfileUrl(u)).toBe(u);
  });

  it('builds profile URL from @handle', () => {
    expect(resolveContributorInstagramProfileUrl('@grahamdouglasbertie')).toBe(
      'https://www.instagram.com/grahamdouglasbertie/'
    );
  });
});
