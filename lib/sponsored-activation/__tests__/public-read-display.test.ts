import { describe, expect, it } from 'vitest';
import { resolveSponsoredActivationDescription } from '@/lib/sponsored-activation/public-read-display';

describe('resolveSponsoredActivationDescription', () => {
  it('prefers activation.description when set', () => {
    expect(
      resolveSponsoredActivationDescription({
        activation: {
          description: '  From activation ',
          sponsor_name: 'Sponsor',
        },
        rewardItem: { description: 'From reward' },
      })
    ).toBe('From activation');
  });

  it('falls back to reward item description', () => {
    expect(
      resolveSponsoredActivationDescription({
        activation: { description: null, sponsor_name: 'Sponsor' },
        rewardItem: { description: '  Reward copy  ' },
      })
    ).toBe('Reward copy');
  });

  it('falls back to sponsor_name', () => {
    expect(
      resolveSponsoredActivationDescription({
        activation: { description: null, sponsor_name: 'Acme Co' },
        rewardItem: { description: null },
      })
    ).toBe('Acme Co');
  });
});
