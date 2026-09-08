import { describe, it, expect } from 'vitest';
import type { Perk } from '@/lib/types';
import { pickHomepagePerks } from '../homepage-perks';

function perk(partial: Partial<Perk> & { id: string; title: string }): Perk {
  return {
    description: '',
    points_threshold: 0,
    type: 'discount',
    ...partial,
  };
}

describe('pickHomepagePerks', () => {
  it('puts the featured perk first and caps at five', () => {
    const perks = [
      perk({ id: '1', title: 'A' }),
      perk({ id: '2', title: 'B', is_featured: true }),
      perk({ id: '3', title: 'C' }),
      perk({ id: '4', title: 'D' }),
      perk({ id: '5', title: 'E' }),
      perk({ id: '6', title: 'F' }),
    ];

    const picked = pickHomepagePerks(perks);

    expect(picked.map((item) => item.id)).toEqual(['2', '1', '3', '4', '5']);
  });

  it('drops perks without an id', () => {
    expect(
      pickHomepagePerks([
        perk({ id: '', title: 'Missing' }),
        perk({ id: 'ok', title: 'Ok' }),
      ])
    ).toEqual([expect.objectContaining({ id: 'ok' })]);
  });
});
