import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Extended timeout for leaderboard queries
export const revalidate = 60; // Cache for 60 seconds

import { getLeaderboard, getPlayerStats, supabase } from "@/lib/supabase";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep cache size manageable)
  if (cache.size > 50) {
    const oldestKey = Array.from(cache.keys())[0];
    cache.delete(oldestKey);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const playerIdParam = searchParams.get("playerId");

    // If requesting specific player stats
    if (playerIdParam) {
      const playerId = parseInt(playerIdParam);
      if (isNaN(playerId)) {
        return NextResponse.json(
          { error: "Invalid player ID" },
          { status: 400 },
        );
      }

      const cacheKey = `player_stats_${playerId}`;
      const cachedStats = getCachedData(cacheKey);

      if (cachedStats) {
        return NextResponse.json({
          success: true,
          playerStats: cachedStats,
          cached: true,
        });
      }

      const playerStats = await getPlayerStats(playerId);
      setCachedData(cacheKey, playerStats);

      return NextResponse.json({
        success: true,
        playerStats,
      });
    }

    // Get leaderboard - support both offset-based and page-based pagination
    const limit = limitParam ? parseInt(limitParam) : 10;
    const offsetParamValue = offsetParam ? parseInt(offsetParam) : null;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam) : null;

    let offset = 0;
    if (offsetParamValue !== null) {
      offset = offsetParamValue;
    } else if (page !== null) {
      offset = (page - 1) * limit;
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: "Offset must be 0 or greater" },
        { status: 400 },
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    const cacheKey = `leaderboard_${limit}_${offset}`;
    const cachedLeaderboard = getCachedData(cacheKey);

    if (cachedLeaderboard) {
      return NextResponse.json({
        success: true,
        leaderboard: cachedLeaderboard,
        totalPlayers: cachedLeaderboard.length,
        pagination: {
          page: page || Math.floor(offset / limit) + 1,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
        cached: true,
      });
    }

    const leaderboard = await getLeaderboard(limit, offset);
    setCachedData(cacheKey, leaderboard);

    return NextResponse.json({
      success: true,
      leaderboard,
      totalPlayers: leaderboard.length,
      pagination: {
        page: page || Math.floor(offset / limit) + 1,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 },
    );
  }
}
