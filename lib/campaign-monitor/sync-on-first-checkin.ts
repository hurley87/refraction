import { playerHasPriorCheckins } from '@/lib/db/player-checkin-history';
import { syncCampaignMonitorOnboarding } from './sync-onboarding';

export type SyncCampaignMonitorOnFirstCheckinInput = {
  playerId: number;
  email?: string | null;
  username?: string | null;
  evmWalletAddress?: string | null;
  source: string;
};

export async function syncCampaignMonitorOnFirstCheckin(
  input: SyncCampaignMonitorOnFirstCheckinInput
): Promise<void> {
  if (!input.email?.trim()) {
    return;
  }

  const hadPriorCheckins = await playerHasPriorCheckins(
    input.playerId,
    input.evmWalletAddress
  );
  if (hadPriorCheckins) {
    return;
  }

  await syncCampaignMonitorOnboarding({
    email: input.email,
    username: input.username,
    source: input.source,
    walletAddressSuffix: input.evmWalletAddress?.trim().slice(-8),
  });
}
