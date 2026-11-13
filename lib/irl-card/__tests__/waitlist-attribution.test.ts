import { describe, expect, it } from 'vitest';
import { buildIrlCardWaitlistAttribution } from '@/lib/irl-card/waitlist-attribution';

const HREF = 'https://www.irl.energy/irl-card/waitlist';

describe('buildIrlCardWaitlistAttribution', () => {
  it('uses UTMs and venue QR source from the current URL', () => {
    const search =
      '?utm_source=venue-qr&utm_medium=qr&utm_campaign=launch&source=venue&source_ref=loc_123';

    expect(
      buildIrlCardWaitlistAttribution({
        search,
        href: `${HREF}${search}`,
        referrer: '',
        stored: { initial_utm_source: 'instagram' },
      })
    ).toEqual({
      utm_source: 'venue-qr',
      utm_medium: 'qr',
      utm_campaign: 'launch',
      source: 'venue',
      source_ref: 'loc_123',
      landing_page: `${HREF}${search}`,
    });
  });

  it('falls back to the stored first touch when the URL has no UTMs', () => {
    expect(
      buildIrlCardWaitlistAttribution({
        search: '',
        href: HREF,
        referrer: 'https://www.irl.energy/',
        stored: {
          initial_utm_source: 'instagram',
          initial_utm_medium: 'social',
          initial_landing_page: 'https://www.irl.energy/?utm_source=instagram',
          initial_referrer: 'https://instagram.com/',
        },
      })
    ).toEqual({
      utm_source: 'instagram',
      utm_medium: 'social',
      landing_page: 'https://www.irl.energy/?utm_source=instagram',
      referrer: 'https://instagram.com/',
    });
  });

  it('drops empty fields and records the current page when nothing is stored', () => {
    expect(
      buildIrlCardWaitlistAttribution({ search: '', href: HREF, referrer: '' })
    ).toEqual({ landing_page: HREF });
  });
});
