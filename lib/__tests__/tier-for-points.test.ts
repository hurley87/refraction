import { describe, expect, it } from 'vitest';
import type { Tier } from '@/lib/types';
import {
  findNextTier,
  formatNextTierProgress,
  formatTierPointRange,
  resolveTierForPoints,
  sortTiersByMinPoints,
} from '@/lib/tier-for-points';

const sampleTiers: Tier[] = [
  {
    id: 'tier-general',
    title: 'General',
    min_points: 0,
    max_points: 5000,
    description: 'Starting out',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-insider',
    title: 'Insider',
    min_points: 5000,
    max_points: 15000,
    description: 'Getting involved',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-resident',
    title: 'Resident',
    min_points: 15000,
    max_points: 25000,
    description: 'Part of the network',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-patron',
    title: 'Patron',
    min_points: 25000,
    max_points: null,
    description: 'Top of the network',
    created_at: '',
    updated_at: '',
  },
];

describe('resolveTierForPoints', () => {
  it('returns the matching tier for a point total', () => {
    expect(resolveTierForPoints(sampleTiers, 9600)?.title).toBe('Insider');
  });
});

describe('sortTiersByMinPoints', () => {
  it('orders by min_points ascending without mutating the input', () => {
    const reversed = [...sampleTiers].reverse();
    const sorted = sortTiersByMinPoints(reversed);
    expect(sorted.map((tier) => tier.title)).toEqual([
      'General',
      'Insider',
      'Resident',
      'Patron',
    ]);
    expect(reversed[0].title).toBe('Patron');
  });
});

describe('findNextTier', () => {
  it('returns the next tier by min_points, not the current floor', () => {
    const insider = sampleTiers[1];
    expect(findNextTier(sampleTiers, insider)?.title).toBe('Resident');
  });

  it('returns null on the top tier', () => {
    const patron = sampleTiers[3];
    expect(findNextTier(sampleTiers, patron)).toBeNull();
  });
});

describe('formatNextTierProgress', () => {
  it('shows remaining points to the next tier name', () => {
    expect(formatNextTierProgress(9600, sampleTiers[2])).toBe(
      '5,400 TO RESIDENT'
    );
  });

  it('says TOP TIER when there is no next tier', () => {
    expect(formatNextTierProgress(30000, null)).toBe('TOP TIER');
  });

  it('does not show a negative remaining count', () => {
    expect(formatNextTierProgress(20000, sampleTiers[2])).toBe('0 TO RESIDENT');
  });
});

describe('formatTierPointRange', () => {
  it('formats a bounded tier and an open top tier', () => {
    expect(formatTierPointRange(sampleTiers[0])).toBe('0 – 5,000');
    expect(formatTierPointRange(sampleTiers[3])).toBe('25,000+');
  });
});
