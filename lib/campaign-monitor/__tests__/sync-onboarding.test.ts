import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncCampaignMonitorOnboarding } from '../sync-onboarding';

vi.mock('../subscribe', () => ({
  addCampaignMonitorSubscriber: vi.fn(),
}));

vi.mock('@/lib/monitoring/capture-handled-exception', () => ({
  captureHandledException: vi.fn(),
}));

import { addCampaignMonitorSubscriber } from '../subscribe';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';

describe('syncCampaignMonitorOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('no-ops when email is missing', async () => {
    await syncCampaignMonitorOnboarding({
      email: undefined,
      source: '/api/player',
    });

    expect(addCampaignMonitorSubscriber).not.toHaveBeenCalled();
  });

  it('calls addCampaignMonitorSubscriber when email is present', async () => {
    vi.mocked(addCampaignMonitorSubscriber).mockResolvedValue(undefined);

    await syncCampaignMonitorOnboarding({
      email: 'user@example.com',
      username: 'handle',
      source: '/api/player',
    });

    expect(addCampaignMonitorSubscriber).toHaveBeenCalledWith({
      email: 'user@example.com',
      username: 'handle',
    });
  });

  it('logs and captures without throwing when subscribe fails', async () => {
    vi.mocked(addCampaignMonitorSubscriber).mockRejectedValue(
      new Error('API down')
    );

    await expect(
      syncCampaignMonitorOnboarding({
        email: 'user@example.com',
        source: '/api/player',
      })
    ).resolves.toBeUndefined();

    expect(captureHandledException).toHaveBeenCalled();
  });
});
