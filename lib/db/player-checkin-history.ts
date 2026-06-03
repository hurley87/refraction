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
  if ((locationCount ?? 0) > 0) {
    return true;
  }

  const wallet = evmWalletAddress?.trim();
  const checkpointByPlayerIdQuery = supabase
    .from('points_activities')
    .select('id', { count: 'exact', head: true })
    .eq('activity_type', 'checkpoint_checkin')
    .eq('metadata->>player_id', String(playerId));

  if (wallet) {
    const checkpointByWalletQuery = supabase
      .from('points_activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_wallet_address', wallet)
      .eq('activity_type', 'checkpoint_checkin');

    const [
      { count: checkpointByWallet, error: walletError },
      { count: checkpointByPlayerId, error: metaError },
    ] = await Promise.all([checkpointByWalletQuery, checkpointByPlayerIdQuery]);

    if (walletError) {
      throw walletError;
    }
    if (metaError) {
      throw metaError;
    }

    return (checkpointByWallet ?? 0) > 0 || (checkpointByPlayerId ?? 0) > 0;
  }

  const { count: checkpointByPlayerId, error: metaError } =
    await checkpointByPlayerIdQuery;

  if (metaError) {
    throw metaError;
  }

  return (checkpointByPlayerId ?? 0) > 0;
}
