import { supabase } from './client';
import type { LeaderboardEntry } from '../types';

// Select specific columns for player queries
const PLAYER_COLUMNS = `
  id,
  wallet_address,
  solana_wallet_address,
  stellar_wallet_address,
  stellar_wallet_id,
  email,
  username,
  total_points,
  created_at,
  updated_at
`;

/**
 * Verify that get_leaderboard_optimized RPC function exists and works
 * @returns true if function exists and works, false otherwise
 */
export const verifyLeaderboardRPC = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('get_leaderboard_optimized', {
      page_limit: 1,
      page_offset: 0,
    });

    if (error) {
      console.error(
        'get_leaderboard_optimized RPC verification failed:',
        error
      );
      return false;
    }

    // Function exists if we get a response (even empty array)
    return Array.isArray(data);
  } catch (err) {
    console.error('Error verifying get_leaderboard_optimized RPC:', err);
    return false;
  }
};

/**
 * Get leaderboard entries with pagination.
 * Tries optimized RPC function first, falls back to manual query.
 */
export const getLeaderboard = async (
  limit: number = 50,
  offset: number = 0
) => {
  // Try optimized database function first
  const { data, error } = await supabase.rpc('get_leaderboard_optimized', {
    page_limit: limit,
    page_offset: offset,
  });

  // If RPC call succeeded, use its data (even if empty array)
  if (!error && data && Array.isArray(data)) {
    // RPC function returns columns matching LeaderboardEntry type exactly:
    // player_id, wallet_address, username, email, total_points, total_checkins, rank
    const mappedData = data.map((entry: any) => ({
      player_id: entry.player_id,
      wallet_address: entry.wallet_address,
      username: entry.username || undefined,
      email: entry.email || undefined,
      total_points: entry.total_points ?? 0,
      total_checkins: entry.total_checkins ?? 0,
      rank: entry.rank ?? 0,
    })) as LeaderboardEntry[];

    return mappedData;
  }

  // Fallback query if RPC doesn't exist or failed
  const { data: players, error: fallbackError } = await supabase
    .from('players')
    .select('id, wallet_address, username, email, total_points')
    .order('total_points', { ascending: false })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (fallbackError) {
    console.error('[getLeaderboard] Fallback query error:', fallbackError);
    throw fallbackError;
  }
  if (!players || players.length === 0) {
    return [];
  }

  // Get checkin counts in one batch query
  const playerIds = players.map((p) => p.id);
  const { data: checkinCounts } = await supabase
    .from('player_location_checkins')
    .select('player_id')
    .in('player_id', playerIds);

  // Map checkin counts
  const checkinMap = new Map<number, number>();
  checkinCounts?.forEach((checkin: any) => {
    checkinMap.set(
      checkin.player_id,
      (checkinMap.get(checkin.player_id) || 0) + 1
    );
  });

  // Calculate ranks using DENSE_RANK logic (same rank for same points)
  // For DENSE_RANK, we need to know how many distinct point values are higher
  // than the first player on this page to determine the correct starting rank.
  //
  // Example: If page 1 has players with 100, 100, 90 points (ranks 1, 1, 2),
  // and page 2 starts with a player having 80 points, their rank should be 3
  // (not offset+1=4), because there are only 2 distinct higher point values.

  const firstPlayerPoints = players[0].total_points ?? 0;

  // Count distinct point values higher than the first player's points
  // This tells us the DENSE_RANK position before this page
  let startingRank = 1;

  if (offset > 0) {
    // Query for count of distinct point values greater than first player's points
    const { data: higherPointsData, error: higherPointsError } = await supabase
      .from('players')
      .select('total_points')
      .gt('total_points', firstPlayerPoints)
      .order('total_points', { ascending: false });

    if (!higherPointsError && higherPointsData) {
      // Count distinct point values
      const distinctHigherPoints = new Set(
        higherPointsData.map((p) => p.total_points ?? 0)
      );
      startingRank = distinctHigherPoints.size + 1;
    }
  }

  // Now apply DENSE_RANK logic within this page
  let currentRank = startingRank;
  let previousPoints: number | null = null;

  const result = players.map((player) => {
    const playerPoints = player.total_points ?? 0;

    // If points changed from previous player (lower), increment rank
    if (previousPoints !== null && playerPoints < previousPoints) {
      currentRank++;
    }
    // If points are the same as previous, keep the same rank (DENSE_RANK behavior)

    previousPoints = playerPoints;

    return {
      player_id: player.id,
      wallet_address: player.wallet_address,
      username: player.username,
      email: player.email,
      total_points: player.total_points,
      total_checkins: checkinMap.get(player.id) || 0,
      rank: currentRank,
    };
  });

  return result;
};

/**
 * Get detailed stats for a specific player including check-in history
 */
export const getPlayerStats = async (playerId: number) => {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .eq('id', playerId)
    .single();

  if (playerError) throw playerError;

  const { data: checkins, error: checkinsError } = await supabase
    .from('player_location_checkins')
    .select(
      `
      *,
      locations (
        name,
        latitude,
        longitude
      )
    `
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (checkinsError) throw checkinsError;

  return {
    player,
    checkins,
    totalCheckins: checkins.length,
    totalPoints: player.total_points,
  };
};
