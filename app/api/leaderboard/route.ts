import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Extended timeout for leaderboard queries
export const revalidate = 60; // Cache for 60 seconds

import { getLeaderboard, getPlayerStats } from "@/lib/db/leaderboard";
import { supabase } from "@/lib/db/client";
import { leaderboardQuerySchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";
import { leaderboardCache, playerStatsCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validationResult = leaderboardQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { limit, offset, page, playerId } = validationResult.data;

    // If requesting specific player stats
    if (playerId) {

      const cacheKey = `player_stats_${playerId}`;
      const cachedStats = playerStatsCache.get(cacheKey);

      if (cachedStats) {
        return apiSuccess({ playerStats: cachedStats, cached: true });
      }

      const playerStats = await getPlayerStats(playerId);
      playerStatsCache.set(cacheKey, playerStats);

      return apiSuccess({ playerStats });
    }

    // Get leaderboard - support both offset-based and page-based pagination
    let finalOffset = offset;
    if (page !== undefined) {
      finalOffset = (page - 1) * limit;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    const cacheKey = `leaderboard_${limit}_${finalOffset}`;
    const cachedLeaderboard = leaderboardCache.get(cacheKey);

    if (cachedLeaderboard) {
      return apiSuccess({
        leaderboard: cachedLeaderboard,
        totalPlayers: cachedLeaderboard.length,
        pagination: {
          page: page || Math.floor(finalOffset / limit) + 1,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
        cached: true,
      });
    }

    const leaderboard = await getLeaderboard(limit, finalOffset);
    leaderboardCache.set(cacheKey, leaderboard);

    return apiSuccess({
      leaderboard,
      totalPlayers: leaderboard.length,
      pagination: {
        page: page || Math.floor(finalOffset / limit) + 1,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return apiError("Failed to fetch leaderboard data", 500);
  }
}
