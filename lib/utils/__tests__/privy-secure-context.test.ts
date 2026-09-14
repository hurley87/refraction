import { describe, expect, it } from 'vitest';

import {
  getHttpsRedirectUrl,
  isPrivyEmbeddedWalletContext,
} from '@/lib/utils/privy-secure-context';

function mockLocation(parts: {
  protocol: string;
  hostname: string;
  href: string;
}): Location {
  return parts as Location;
}

describe('isPrivyEmbeddedWalletContext', () => {
  it('allows localhost and 127.0.0.1 over HTTP', () => {
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'http:',
          hostname: 'localhost',
          href: 'http://localhost:3000/dashboard',
        })
      )
    ).toBe(true);
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'http:',
          hostname: '127.0.0.1',
          href: 'http://127.0.0.1:3000/',
        })
      )
    ).toBe(true);
  });

  it('allows HTTPS and chrome-extension protocols on any host', () => {
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'https:',
          hostname: 'www.irl.energy',
          href: 'https://www.irl.energy/dashboard',
        })
      )
    ).toBe(true);
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'chrome-extension:',
          hostname: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
          href: 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/popup.html',
        })
      )
    ).toBe(true);
  });

  it('rejects HTTP on non-localhost hosts (Privy embedded wallet requirement)', () => {
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'http:',
          hostname: 'www.irl.energy',
          href: 'http://www.irl.energy/dashboard',
        })
      )
    ).toBe(false);
    expect(
      isPrivyEmbeddedWalletContext(
        mockLocation({
          protocol: 'http:',
          hostname: '192.168.1.10',
          href: 'http://192.168.1.10:3000/',
        })
      )
    ).toBe(false);
  });
});

describe('getHttpsRedirectUrl', () => {
  it('upgrades protocol while preserving path, query, and hash', () => {
    expect(
      getHttpsRedirectUrl(
        mockLocation({
          protocol: 'http:',
          hostname: 'www.irl.energy',
          href: 'http://www.irl.energy/events?city=nyc#schedule',
        })
      )
    ).toBe('https://www.irl.energy/events?city=nyc#schedule');
  });
});
