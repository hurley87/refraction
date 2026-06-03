import { supabase } from './client';

/**
 * Whether the player has any prior location or checkpoint check-ins.
 * Used before recording a new check-in to detect first-time activation.
 */
export async function playerHasPriorCheckins(
  playerId: number,
  evmWalletAddress?: string | null
): Promise<boolean> {
  const { count: locationCount, error: locationError } = await supabase
    .from('player_location_checkins')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId);

  if (locationError) {
    throw locationError;
  }
  if (locationCount && locationCount > 0) {
    return true;
  }

  const wallet = evmWalletAddress?.trim();
  if (wallet) {
    const { count: checkpointByWallet, error: walletError } = await supabase
      .from('points_activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_wallet_address', wallet)
      .eq('activity_type', 'checkpoint_checkin');

    if (walletError) {
      throw walletError;
    }
    if (checkpointByWallet && checkpointByWallet > 0) {
      return true;
    }
  }

  const { count: checkpointByPlayerId, error: metaError } = await supabase
    .from('points_activities')
    .select('id', { count: 'exact', head: true })
    .eq('activity_type', 'checkpoint_checkin')
    .eq('metadata->>player_id', String(playerId));

  if (metaError) {
    throw metaError;
  }

  return (checkpointByPlayerId ?? 0) > 0;
}
