import { describe, it, expect } from 'vitest';
import type { Perk } from '@/lib/types';
import {
  buildPerkShareCard,
  isPerkShareable,
  perkShareDescription,
  perkShareImagePath,
  perkSharePath,
  perkSharePointsLabel,
  perkShareTitle,
  perkShareVenueLabel,
} from '../perk-share-card';

function perk(overrides: Partial<Perk> = {}): Perk {
  return {
    id: 'perk-1',
    title: "Bambi's Free Drink",
    description: 'One free drink on us. Valid any night the venue is open.',
    location: 'Toronto',
    points_threshold: 1500,
    type: 'bar',
    is_active: true,
    ...overrides,
  };
}

describe('isPerkShareable', () => {
  const now = new Date('2026-09-02T12:00:00.000Z');

  it('shares an active, listed perk with no end date', () => {
    expect(isPerkShareable(perk({ end_date: undefined }), now)).toBe(true);
  });

  it('shares a perk whose end date is still ahead', () => {
    expect(
      isPerkShareable(perk({ end_date: '2026-09-30T00:00:00.000Z' }), now)
    ).toBe(true);
  });

  it('does not share inactive, unlisted, or expired perks', () => {
    expect(isPerkShareable(perk({ is_active: false }), now)).toBe(false);
    expect(isPerkShareable(perk({ is_unlisted: true }), now)).toBe(false);
    expect(
      isPerkShareable(perk({ end_date: '2026-08-01T00:00:00.000Z' }), now)
    ).toBe(false);
  });

  it('shares a perk with an unparseable end date rather than hiding it', () => {
    expect(isPerkShareable(perk({ end_date: 'someday' }), now)).toBe(true);
  });
});

describe('perk share copy', () => {
  it('titles the preview with the reward name', () => {
    expect(perkShareTitle(perk())).toBe("Bambi's Free Drink on IRL");
  });

  it('describes the reward with its first sentence', () => {
    expect(perkShareDescription(perk())).toBe('One free drink on us.');
  });

  it('clips a long first sentence on a word boundary', () => {
    const description = `IRL members get up to 40% off best available rates at Arlo Hotels in New York City, Washington D.C., Chicago and Miami, plus waived urban fees, 2pm late check-out and a $5 coffee credit per room, per stay`;
    const result = perkShareDescription(perk({ description }));

    expect(result.length).toBeLessThanOrEqual(201);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('  ');
    expect(description.startsWith(result.slice(0, -1))).toBe(true);
  });

  it('falls back to house copy when a reward has no description', () => {
    expect(perkShareDescription(perk({ description: '  ' }))).toBe(
      'A member reward from the IRL Venue Network.'
    );
  });

  it('hides the venue line for globally available rewards', () => {
    expect(perkShareVenueLabel(perk({ location: 'Global' }))).toBe('');
    expect(perkShareVenueLabel(perk())).toBe('Toronto');
  });

  it('labels the points cost, or calls out free rewards', () => {
    expect(perkSharePointsLabel(perk())).toBe('1,500 points');
    expect(perkSharePointsLabel(perk({ points_threshold: 0 }))).toBe(
      'Free for members'
    );
  });
});

describe('buildPerkShareCard', () => {
  it('prefers the hero image over the thumbnail', () => {
    const card = buildPerkShareCard(
      perk({
        hero_image: 'https://cdn.test/hero.jpg',
        thumbnail_url: 'https://cdn.test/thumb.jpg',
      })
    );
    expect(card.photoUrl).toBe('https://cdn.test/hero.jpg');
    expect(card.title).toBe("Bambi's Free Drink");
    expect(card.pointsLabel).toBe('1,500 points');
    expect(card.venueLabel).toBe('Toronto');
  });

  it('falls back to the thumbnail, then to no photo', () => {
    expect(
      buildPerkShareCard(perk({ thumbnail_url: 'https://cdn.test/thumb.jpg' }))
        .photoUrl
    ).toBe('https://cdn.test/thumb.jpg');
    expect(buildPerkShareCard(perk()).photoUrl).toBeNull();
  });
});

describe('perk share paths', () => {
  it('keeps the perkId query param the catalog needs to open the drawer', () => {
    expect(perkSharePath('abc 123')).toBe('/rewards?perkId=abc%20123');
  });

  it('points at the branded card for the perk', () => {
    expect(perkShareImagePath('abc-123')).toBe('/api/og/reward/abc-123');
  });
});
