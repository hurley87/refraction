import { playerHasPriorCheckins } from '@/lib/db/player-checkin-history';
import { syncCampaignMonitorOnboarding } from './sync-onboarding';

export type SyncCampaignMonitorOnFirstCheckinInput = {
  playerId: number;
  email?: string | null;
  username?: string | null;
  evmWalletAddress?: string | null;
  source: string;
};

/**
 * Adds the user to Campaign Monitor Onboarding on their first check-in when email is known.
 */
export async function syncCampaignMonitorOnFirstCheckin(
  input: SyncCampaignMonitorOnFirstCheckinInput
): Promise<void> {
  const hadPriorCheckins = await playerHasPriorCheckins(
    input.playerId,
    input.evmWalletAddress
  );
  if (hadPriorCheckins) {
    return;
  }

  const walletSuffix = input.evmWalletAddress?.trim().slice(-8);

  await syncCampaignMonitorOnboarding({
    email: input.email,
    username: input.username,
    source: input.source,
    walletAddressSuffix: walletSuffix,
  });
}
