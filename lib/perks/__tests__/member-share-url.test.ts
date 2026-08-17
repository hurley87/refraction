import { describe, it, expect } from 'vitest';
import { buildPerkMemberShareUrl } from '../member-share-url';

describe('buildPerkMemberShareUrl', () => {
  it('builds the canonical host with exact UTM params from the perk title', () => {
    expect(
      buildPerkMemberShareUrl({
        title: "Bambi's Free Drink",
        perkId: 'abc-123',
      })
    ).toBe(
      'https://www.irl.energy/rewards?perkId=abc-123&utm_source=member-share&utm_medium=share&utm_campaign=bambi-s-free-drink'
    );
  });

  it('falls back to perk id when the title slugs empty', () => {
    expect(
      buildPerkMemberShareUrl({
        title: '!!!',
        perkId: 'perk-uuid',
      })
    ).toBe(
      'https://www.irl.energy/rewards?perkId=perk-uuid&utm_source=member-share&utm_medium=share&utm_campaign=perk-uuid'
    );
  });
});
