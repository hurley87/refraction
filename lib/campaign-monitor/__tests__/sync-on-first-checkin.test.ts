import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncCampaignMonitorOnFirstCheckin } from '../sync-on-first-checkin';

vi.mock('@/lib/db/player-checkin-history', () => ({
  playerHasPriorCheckins: vi.fn(),
}));

vi.mock('../sync-onboarding', () => ({
  syncCampaignMonitorOnboarding: vi.fn(),
}));

import { playerHasPriorCheckins } from '@/lib/db/player-checkin-history';
import { syncCampaignMonitorOnboarding } from '../sync-onboarding';

describe('syncCampaignMonitorOnFirstCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips sync when player already has check-ins', async () => {
    vi.mocked(playerHasPriorCheckins).mockResolvedValue(true);

    await syncCampaignMonitorOnFirstCheckin({
      playerId: 1,
      email: 'user@example.com',
      source: 'test',
    });

    expect(syncCampaignMonitorOnboarding).not.toHaveBeenCalled();
  });

  it('syncs when this is the first check-in and email is present', async () => {
    vi.mocked(playerHasPriorCheckins).mockResolvedValue(false);

    await syncCampaignMonitorOnFirstCheckin({
      playerId: 1,
      email: 'user@example.com',
      username: 'handle',
      evmWalletAddress: '0x1234567890abcdef',
      source: '/api/location-checkin',
    });

    expect(syncCampaignMonitorOnboarding).toHaveBeenCalledWith({
      email: 'user@example.com',
      username: 'handle',
      source: '/api/location-checkin',
      walletAddressSuffix: '90abcdef',
    });
  });
});
