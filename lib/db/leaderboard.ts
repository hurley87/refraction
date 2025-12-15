import { supabase } from "./client";
import type { LeaderboardEntry } from "../types";

/**
 * Get leaderboard entries with pagination.
 * Tries optimized RPC function first, falls back to manual query.
 */
export const getLeaderboard = async (
  limit: number = 50,
  offset: number = 0,
) => {
  // Try optimized database function first
  const { data, error } = await supabase.rpc("get_leaderboard_optimized", {
    page_limit: limit,
    page_offset: offset,
  });

  if (!error && data) {
    return data as LeaderboardEntry[];
  }

  // Simple fallback query if RPC doesn't exist
  const { data: players, error: fallbackError } = await supabase
    .from("players")
    .select("id, wallet_address, username, email, total_points")
    .order("total_points", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (fallbackError) throw fallbackError;
  if (!players || players.length === 0) return [];

  // Get checkin counts in one batch query
  const playerIds = players.map((p) => p.id);
  const { data: checkinCounts } = await supabase
    .from("player_location_checkins")
    .select("player_id")
    .in("player_id", playerIds);

  // Map checkin counts
  const checkinMap = new Map<number, number>();
  checkinCounts?.forEach((checkin: any) => {
    checkinMap.set(
      checkin.player_id,
      (checkinMap.get(checkin.player_id) || 0) + 1,
    );
  });

  // Simple sequential ranking
  return players.map((player, index) => ({
    player_id: player.id,
    wallet_address: player.wallet_address,
    username: player.username,
    email: player.email,
    total_points: player.total_points,
    total_checkins: checkinMap.get(player.id) || 0,
    rank: offset + index + 1,
  }));
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

