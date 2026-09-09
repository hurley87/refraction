import { describe, it, expect } from 'vitest';
import type { Perk } from '@/lib/types';
import { pickHomepagePerks } from '../homepage-perks';

function perk(partial: Partial<Perk> & { id: string; title: string }): Perk {
  return {
    description: '',
    points_threshold: 0,
    type: 'bar',
    ...partial,
  };
}

describe('pickHomepagePerks', () => {
  it('puts the featured perk first, then newest remaining, and caps at six', () => {
    const perks = [
      perk({ id: '1', title: 'A', created_at: '2026-01-01T00:00:00Z' }),
      perk({
        id: '2',
        title: 'B',
        is_featured: true,
        created_at: '2026-01-02T00:00:00Z',
      }),
      perk({ id: '3', title: 'C', created_at: '2026-01-07T00:00:00Z' }),
      perk({ id: '4', title: 'D', created_at: '2026-01-04T00:00:00Z' }),
      perk({ id: '5', title: 'E', created_at: '2026-01-06T00:00:00Z' }),
      perk({ id: '6', title: 'F', created_at: '2026-01-03T00:00:00Z' }),
      perk({ id: '7', title: 'G', created_at: '2026-01-05T00:00:00Z' }),
    ];

    const picked = pickHomepagePerks(perks);

    expect(picked.map((item) => item.id)).toEqual([
      '2',
      '3',
      '5',
      '7',
      '4',
      '6',
    ]);
  });

  it('drops perks without an id', () => {
    expect(
      pickHomepagePerks([
        perk({ id: '', title: 'Missing' }),
        perk({ id: 'ok', title: 'Ok' }),
      ])
    ).toEqual([expect.objectContaining({ id: 'ok' })]);
  });

  it('keeps venue types and drops software, membership, and mobility', () => {
    const picked = pickHomepagePerks([
      perk({ id: 'soft', title: 'App', type: 'software' }),
      perk({ id: 'mem', title: 'Pass', type: 'membership' }),
      perk({ id: 'ride', title: 'Ride', type: 'mobility' }),
      perk({ id: 'hotel', title: 'Stay', type: 'hotel' }),
      perk({ id: 'cafe', title: 'Coffee', type: 'Cafe' }),
      perk({ id: 'cafes', title: 'Coffee too', type: 'cafes' }),
    ]);

    expect(picked.map((item) => item.id)).toEqual(['hotel', 'cafe', 'cafes']);
  });

  it('sorts remaining venue perks newest to oldest regardless of input order', () => {
    const picked = pickHomepagePerks([
      perk({ id: 'old', title: 'Old', created_at: '2025-01-01T00:00:00Z' }),
      perk({ id: 'new', title: 'New', created_at: '2026-09-01T00:00:00Z' }),
      perk({ id: 'mid', title: 'Mid', created_at: '2026-03-01T00:00:00Z' }),
    ]);

    expect(picked.map((item) => item.id)).toEqual(['new', 'mid', 'old']);
  });
});
