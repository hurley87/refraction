import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getLeaderboard, getPlayerStats } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const playerIdParam = searchParams.get("playerId");

    // If requesting specific player stats
    if (playerIdParam) {
      const playerId = parseInt(playerIdParam);
      if (isNaN(playerId)) {
        return NextResponse.json(
          { error: "Invalid player ID" },
          { status: 400 }
        );
      }

      const playerStats = await getPlayerStats(playerId);
      return NextResponse.json({
        success: true,
        playerStats,
      });
    }

    // Get leaderboard
    const limit = limitParam ? parseInt(limitParam) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const leaderboard = await getLeaderboard(limit);

    return NextResponse.json({
      success: true,
      leaderboard,
      totalPlayers: leaderboard.length,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
}
