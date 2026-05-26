import type { NextRequest } from 'next/server';
import { getPrivyUserIdFromRequest } from '@/lib/api/privy';
import { resolveServerIdentity } from '@/lib/analytics/server';

/**
 * Resolves distinct_id from the Privy-authenticated request + wallet, then runs
 * `emit` (typically Mixpanel). Swallows errors so HTTP flows are not blocked.
 */
export async function emitSponsoredAnalyticsForWalletRequest(
  request: NextRequest,
  walletAddress: string,
  playerId: number,
  emit: (distinctId: string) => void
): Promise<void> {
  try {
    const privyUserId = await getPrivyUserIdFromRequest(request);
    emit(
      resolveServerIdentity({
        privyUserId: privyUserId ?? undefined,
        walletAddress,
        playerId,
      })
    );
  } catch {
    /* analytics best-effort */
  }
}
