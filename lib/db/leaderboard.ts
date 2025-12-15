import { supabase } from "./client";
import type { LeaderboardEntry } from "../types";

/**
 * Verify that get_leaderboard_optimized RPC function exists and works
 * @returns true if function exists and works, false otherwise
 */
export const verifyLeaderboardRPC = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("get_leaderboard_optimized", {
      page_limit: 1,
      page_offset: 0,
    });

    if (error) {
      console.error("get_leaderboard_optimized RPC verification failed:", error);
      return false;
    }

    // Function exists if we get a response (even empty array)
    return Array.isArray(data);
  } catch (err) {
    console.error("Error verifying get_leaderboard_optimized RPC:", err);
    return false;
  }
};

/**
 * Get leaderboard entries with pagination.
 * Tries optimized RPC function first, falls back to manual query.
 */
export const getLeaderboard = async (
  limit: number = 50,
  offset: number = 0,
) => {
  console.log(`[getLeaderboard] Fetching leaderboard with limit=${limit}, offset=${offset}`);
  
  // Try optimized database function first
  const { data, error } = await supabase.rpc("get_leaderboard_optimized", {
    page_limit: limit,
    page_offset: offset,
  });

  console.log(`[getLeaderboard] RPC response:`, { 
    hasError: !!error, 
    error: error?.message, 
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataLength: Array.isArray(data) ? data.length : 'N/A',
    firstEntry: Array.isArray(data) && data.length > 0 ? data[0] : null
  });

  // If RPC call succeeded, use its data (even if empty array)
  if (!error && data && Array.isArray(data)) {
    console.log(`[getLeaderboard] Using RPC data, mapping ${data.length} entries`);
    
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
    
    console.log(`[getLeaderboard] Returning ${mappedData.length} mapped entries`);
    // Return mapped data (empty array is valid - means no players)
    return mappedData;
  }

  // Log error if RPC failed (but don't throw - use fallback)
  if (error) {
    console.warn(
      "[getLeaderboard] get_leaderboard_optimized RPC failed, using fallback:",
      error.message,
      error,
    );
  } else if (data === null || !Array.isArray(data)) {
    console.warn(
      "[getLeaderboard] get_leaderboard_optimized RPC returned invalid data format, using fallback",
      { data },
    );
  }
  
  console.log(`[getLeaderboard] Falling back to manual query`);

  // Simple fallback query if RPC doesn't exist or returned empty
  console.log(`[getLeaderboard] Executing fallback query from players table`);
  const { data: players, error: fallbackError } = await supabase
    .from("players")
    .select("id, wallet_address, username, email, total_points")
    .order("total_points", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  console.log(`[getLeaderboard] Fallback query result:`, {
    hasError: !!fallbackError,
    error: fallbackError?.message,
    playersCount: players?.length || 0,
    firstPlayer: players && players.length > 0 ? players[0] : null
  });

  if (fallbackError) {
    console.error("[getLeaderboard] Fallback query error:", fallbackError);
    throw fallbackError;
  }
  if (!players || players.length === 0) {
    console.warn("[getLeaderboard] No players found in fallback query");
    return [];
  }

  // Get checkin counts in one batch query
  const playerIds = players.map((p) => p.id);
  console.log(`[getLeaderboard] Fetching checkin counts for ${playerIds.length} players`);
  const { data: checkinCounts } = await supabase
    .from("player_location_checkins")
    .select("player_id")
    .in("player_id", playerIds);

  console.log(`[getLeaderboard] Found ${checkinCounts?.length || 0} checkin records`);

  // Map checkin counts
  const checkinMap = new Map<number, number>();
  checkinCounts?.forEach((checkin: any) => {
    checkinMap.set(
      checkin.player_id,
      (checkinMap.get(checkin.player_id) || 0) + 1,
    );
  });

  // Calculate ranks using DENSE_RANK logic (same rank for same points)
  // Players are already sorted by total_points DESC, id ASC
  let currentRank = offset + 1;
  let previousPoints: number | null = null;
  
  const result = players.map((player, index) => {
    const playerPoints = player.total_points ?? 0;
    
    // If points changed from previous player, update rank
    if (previousPoints !== null && playerPoints < previousPoints) {
      currentRank = offset + index + 1;
    } else if (previousPoints === null) {
      // First player
      currentRank = offset + 1;
    }
    // If points are the same, keep the same rank
    
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
  
  console.log(`[getLeaderboard] Returning ${result.length} entries from fallback`);
  return result;
};

/**
 * Get detailed stats for a specific player including check-in history
 */
export const getPlayerStats = async (playerId: number) => {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (playerError) throw playerError;

  const { data: checkins, error: checkinsError } = await supabase
    .from("player_location_checkins")
    .select(
      `
      *,
      locations (
        name,
        display_name,
        latitude,
        longitude
      )
    `,
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (checkinsError) throw checkinsError;

  return {
    player,
    checkins,
    totalCheckins: checkins.length,
    totalPoints: player.total_points,
  };
};

