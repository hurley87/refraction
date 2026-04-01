import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tier } from '@/lib/types';

const sampleTiers: Tier[] = [
  {
    id: 'tier-general',
    title: 'General',
    min_points: 0,
    max_points: 5000,
    description: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-insider',
    title: 'Insider',
    min_points: 5000,
    max_points: 15000,
    description: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-resident',
    title: 'Resident',
    min_points: 15000,
    max_points: 25000,
    description: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-patron',
    title: 'Patron',
    min_points: 25000,
    max_points: null,
    description: '',
    created_at: '',
    updated_at: '',
  },
];

const mockGetTiers = vi.fn();
const mockTrackTierProgression = vi.fn();
const mockSetUserPropertiesServer = vi.fn();

vi.mock('@/lib/db/tiers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/tiers')>();
  return {
    ...actual,
    getTiers: (...args: unknown[]) => mockGetTiers(...args),
  };
});

vi.mock('@/lib/analytics/server', () => ({
  trackTierProgression: (...args: unknown[]) =>
    mockTrackTierProgression(...args),
  setUserProperties: (...args: unknown[]) =>
    mockSetUserPropertiesServer(...args),
}));

import { checkAndTrackTierProgression } from '@/lib/tier-progression';

describe('checkAndTrackTierProgression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTiers.mockResolvedValue(sampleTiers);
  });

  it('should set tier user property even when tier does not change', async () => {
    await checkAndTrackTierProgression('0xABC', 100, 200);

    expect(mockSetUserPropertiesServer).toHaveBeenCalledWith('0xABC', {
      tier: 'General',
      total_points: 200,
    });
    expect(mockTrackTierProgression).not.toHaveBeenCalled();
  });

  it('should fire tier_progression event when tier changes upward', async () => {
    await checkAndTrackTierProgression('0xABC', 4900, 5100);

    expect(mockTrackTierProgression).toHaveBeenCalledWith('0xABC', {
      previous_tier: 'General',
      new_tier: 'Insider',
      total_points: 5100,
    });
    expect(mockSetUserPropertiesServer).toHaveBeenCalledWith('0xABC', {
      tier: 'Insider',
      total_points: 5100,
    });
  });

  it('should fire tier_progression event when tier changes downward (spend)', async () => {
    await checkAndTrackTierProgression('0xABC', 5100, 4900);

    expect(mockTrackTierProgression).toHaveBeenCalledWith('0xABC', {
      previous_tier: 'Insider',
      new_tier: 'General',
      total_points: 4900,
    });
  });

  it('should handle progression from General to Patron', async () => {
    await checkAndTrackTierProgression('0xABC', 0, 25000);

    expect(mockTrackTierProgression).toHaveBeenCalledWith('0xABC', {
      previous_tier: 'General',
      new_tier: 'Patron',
      total_points: 25000,
    });
  });

  it('should handle exact boundary (5000 is Insider, not General)', async () => {
    await checkAndTrackTierProgression('0xABC', 4999, 5000);

    expect(mockTrackTierProgression).toHaveBeenCalledWith('0xABC', {
      previous_tier: 'General',
      new_tier: 'Insider',
      total_points: 5000,
    });
  });

  it('should not fire event when staying in the same tier', async () => {
    await checkAndTrackTierProgression('0xABC', 5000, 5100);

    expect(mockTrackTierProgression).not.toHaveBeenCalled();
    expect(mockSetUserPropertiesServer).toHaveBeenCalledWith('0xABC', {
      tier: 'Insider',
      total_points: 5100,
    });
  });

  it('should handle empty tiers gracefully', async () => {
    mockGetTiers.mockResolvedValue([]);

    await checkAndTrackTierProgression('0xABC', 100, 200);

    expect(mockTrackTierProgression).not.toHaveBeenCalled();
    expect(mockSetUserPropertiesServer).not.toHaveBeenCalled();
  });

  it('should not throw when getTiers fails', async () => {
    mockGetTiers.mockRejectedValue(new Error('DB error'));

    await expect(
      checkAndTrackTierProgression('0xABC', 100, 200)
    ).resolves.toBeUndefined();

    expect(mockTrackTierProgression).not.toHaveBeenCalled();
  });

  it('should handle zero points (new player)', async () => {
    await checkAndTrackTierProgression('0xABC', 0, 100);

    expect(mockSetUserPropertiesServer).toHaveBeenCalledWith('0xABC', {
      tier: 'General',
      total_points: 100,
    });
    expect(mockTrackTierProgression).not.toHaveBeenCalled();
  });
});
