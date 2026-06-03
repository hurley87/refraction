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

  it('skips history lookup when email is missing', async () => {
    await syncCampaignMonitorOnFirstCheckin({
      playerId: 1,
      email: null,
      source: 'test',
    });

    expect(playerHasPriorCheckins).not.toHaveBeenCalled();
    expect(syncCampaignMonitorOnboarding).not.toHaveBeenCalled();
  });

  it('skips sync when player already has check-ins and had email on file', async () => {
    vi.mocked(playerHasPriorCheckins).mockResolvedValue(true);

    await syncCampaignMonitorOnFirstCheckin({
      playerId: 1,
      email: 'user@example.com',
      source: 'test',
      hadStoredEmailBeforeCheckin: true,
    });

    expect(syncCampaignMonitorOnboarding).not.toHaveBeenCalled();
  });

  it('syncs when player has prior check-ins but email was not stored before', async () => {
    vi.mocked(playerHasPriorCheckins).mockResolvedValue(true);

    await syncCampaignMonitorOnFirstCheckin({
      playerId: 1,
      email: 'user@example.com',
      source: 'test',
      hadStoredEmailBeforeCheckin: false,
    });

    expect(syncCampaignMonitorOnboarding).toHaveBeenCalledWith({
      email: 'user@example.com',
      username: undefined,
      source: 'test',
      walletAddressSuffix: undefined,
    });
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
