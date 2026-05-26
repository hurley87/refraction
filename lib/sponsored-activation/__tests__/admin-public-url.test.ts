import { describe, it, expect } from 'vitest';
import {
  sponsoredActivationPublicPath,
  sponsoredActivationPublicUrl,
  sponsoredActivationQrGuestSharePath,
  sponsoredActivationQrGuestShareUrl,
} from '@/lib/sponsored-activation/admin-public-url';

describe('sponsoredActivationPublicPath', () => {
  it('builds activation route from slug or id', () => {
    expect(sponsoredActivationPublicPath('my-slug')).toBe(
      '/activation/my-slug'
    );
    expect(
      sponsoredActivationPublicPath('01a3e4bd-a585-45b1-ae68-ec38b3a4df3f')
    ).toBe('/activation/01a3e4bd-a585-45b1-ae68-ec38b3a4df3f');
  });

  it('treats blank keys as bare activation route', () => {
    expect(sponsoredActivationPublicPath('')).toBe('/activation');
    expect(sponsoredActivationPublicPath('   ')).toBe('/activation');
  });
});

describe('sponsoredActivationPublicUrl', () => {
  it('joins origin and path', () => {
    expect(sponsoredActivationPublicUrl('abc', 'https://irl.energy')).toBe(
      'https://irl.energy/activation/abc'
    );
    expect(sponsoredActivationPublicUrl('abc', 'https://irl.energy/')).toBe(
      'https://irl.energy/activation/abc'
    );
  });
});

describe('sponsoredActivationQrGuestSharePath', () => {
  it('appends qr_scan and source_ref_id', () => {
    expect(sponsoredActivationQrGuestSharePath('my-slug', 'Launch Party')).toBe(
      '/activation/my-slug?source=qr_scan&source_ref_id=Launch+Party'
    );
  });

  it('trims source_ref_id', () => {
    expect(sponsoredActivationQrGuestSharePath('x', '  ref  ')).toBe(
      '/activation/x?source=qr_scan&source_ref_id=ref'
    );
  });

  it('omits query when ref is blank after trim', () => {
    expect(sponsoredActivationQrGuestSharePath('x', '   ')).toBe(
      '/activation/x'
    );
  });
});

describe('sponsoredActivationQrGuestShareUrl', () => {
  it('joins origin, path, and QR params', () => {
    expect(
      sponsoredActivationQrGuestShareUrl(
        'my-slug',
        'https://example.test',
        'Launch Party'
      )
    ).toBe(
      'https://example.test/activation/my-slug?source=qr_scan&source_ref_id=Launch+Party'
    );
  });
});
