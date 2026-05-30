import { describe, expect, it } from 'vitest';

import {
  getDefaultMetadataBase,
  getMetadataBaseForRequest,
  isAllowedMetadataHost,
  stripHostPort,
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
