import { describe, expect, it } from 'vitest';

import {
  defaultLinkPreviewImageUrl,
  getDefaultMetadataBase,
  getMetadataBaseForRequest,
  isAllowedMetadataHost,
  stripHostPort,
  toSocialPreviewImageUrl,
} from '@/lib/metadata/request-base';

describe('stripHostPort', () => {
  it('removes a trailing port from production hosts', () => {
    expect(stripHostPort('www.irl.energy:443')).toBe('www.irl.energy');
    expect(stripHostPort('irl.energy:443')).toBe('irl.energy');
  });

  it('uses the first forwarded host', () => {
    expect(stripHostPort('www.irl.energy, irl.energy')).toBe('www.irl.energy');
  });
});

describe('isAllowedMetadataHost', () => {
  it('allows apex, www, and hostnames with ports', () => {
    expect(isAllowedMetadataHost('www.irl.energy')).toBe(true);
    expect(isAllowedMetadataHost('www.irl.energy:443')).toBe(true);
    expect(isAllowedMetadataHost('irl.energy')).toBe(true);
    expect(isAllowedMetadataHost('unknown.example')).toBe(false);
  });
});

describe('getMetadataBaseForRequest', () => {
  it('canonicalizes www requests to https://www.irl.energy', () => {
    const { metadataBase } = getMetadataBaseForRequest(
      new Headers({
        host: 'www.irl.energy',
        'x-forwarded-proto': 'https',
      })
    );

    expect(metadataBase.href).toBe('https://www.irl.energy/');
  });

  it('canonicalizes apex requests to https://www.irl.energy', () => {
    const { metadataBase } = getMetadataBaseForRequest(
      new Headers({
        host: 'irl.energy',
        'x-forwarded-proto': 'https',
      })
    );

    expect(metadataBase.href).toBe('https://www.irl.energy/');
  });

  it('handles forwarded host with port', () => {
    const { metadataBase } = getMetadataBaseForRequest(
      new Headers({
        'x-forwarded-host': 'www.irl.energy:443',
        'x-forwarded-proto': 'https',
      })
    );

    expect(metadataBase.href).toBe('https://www.irl.energy/');
  });
});

describe('getDefaultMetadataBase', () => {
  it('defaults to canonical www production origin', () => {
    expect(getDefaultMetadataBase().href).toBe('https://www.irl.energy/');
  });
});

describe('defaultLinkPreviewImageUrl', () => {
  it('uses a clean path without spaces or query params', () => {
    const metadataBase = new URL('https://www.irl.energy');
    expect(defaultLinkPreviewImageUrl(metadataBase)).toBe(
      'https://www.irl.energy/link-preview/og-default.png'
    );
  });
});

describe('toSocialPreviewImageUrl', () => {
  const metadataBase = new URL('https://www.irl.energy');

  it('routes Supabase storage images through the JPEG transform endpoint', () => {
    const result = toSocialPreviewImageUrl(
      'https://pwuhplqevqeonostnkgj.supabase.co/storage/v1/object/public/images/uploads/hero.webp',
      metadataBase
    );

    expect(result.type).toBe('image/jpeg');
    expect(result.url).toContain(
      'https://pwuhplqevqeonostnkgj.supabase.co/storage/v1/render/image/public/images/uploads/hero.webp'
    );
    expect(result.url).toContain('width=1200');
    expect(result.url).toContain('resize=cover');
  });

  it('falls back to the branded PNG for non-transformable WebP', () => {
    expect(
      toSocialPreviewImageUrl('https://cdn.example.com/hero.webp', metadataBase)
    ).toEqual({
      url: 'https://www.irl.energy/link-preview/og-default.png',
      type: 'image/png',
      width: 1200,
      height: 628,
    });
  });

  it('passes through non-WebP URLs with a best-effort MIME type', () => {
    expect(
      toSocialPreviewImageUrl('https://cdn.example.com/hero.png', metadataBase)
    ).toEqual({
      url: 'https://cdn.example.com/hero.png',
      type: 'image/png',
    });
  });
});
