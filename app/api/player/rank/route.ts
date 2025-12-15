import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Extended timeout
export const revalidate = 60; // Cache for 60 seconds

// GET /api/player/rank?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return apiError("Wallet address is required", 400);
    }

    // Get the user's player data including id for proper ranking
    const { data: userPlayer, error: userError } = await supabase
      .from("players")
      .select("id, total_points")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        // User not found
        return apiSuccess({
          rank: null,
          total_points: 0,
        });
      }
      throw userError;
    }

    // Calculate rank by counting how many players come before this user
    // Using the same ordering as leaderboard: ORDER BY COALESCE(total_points, 0) DESC, id ASC
    // This matches the get_leaderboard_optimized function logic exactly
    const userPoints = userPlayer.total_points ?? 0;
    
    console.log(`[PlayerRank] Calculating rank for player:`, {
      id: userPlayer.id,
      walletAddress,
      total_points: userPlayer.total_points,
      userPoints,
    });
    
    // Get all players ordered the same way as leaderboard
    // Note: We need to handle NULL total_points the same way as the SQL function (COALESCE to 0)
    // Supabase doesn't support COALESCE in order, so we'll fetch and sort in code
    const { data: allPlayers, error: rankError } = await supabase
      .from("players")
      .select("id, total_points")
      .order("id", { ascending: true }); // Get all players, we'll sort by points in code

    if (rankError) throw rankError;

    console.log(`[PlayerRank] Found ${allPlayers?.length || 0} total players`);

    // Sort players the same way as the leaderboard function:
    // ORDER BY COALESCE(total_points, 0) DESC, id ASC
    const sortedPlayers = (allPlayers || []).sort((a, b) => {
      const aPoints = a.total_points ?? 0;
      const bPoints = b.total_points ?? 0;
      
      // First sort by points (descending)
      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      
      // If points are equal, sort by id (ascending)
      return a.id - b.id;
    });

    console.log(`[PlayerRank] Sorted ${sortedPlayers.length} players`);
    if (sortedPlayers.length > 0) {
      console.log(`[PlayerRank] Top 5 players:`, sortedPlayers.slice(0, 5).map(p => ({
        id: p.id,
        points: p.total_points ?? 0
      })));
    }

    // Calculate rank using DENSE_RANK logic (same rank for same points)
    // Group players by points and assign ranks
    let currentRank = 1;
    let previousPoints: number | null = null;
    let userRank: number | null = null;

    for (const p of sortedPlayers) {
      const pPoints = p.total_points ?? 0;
      
      // If points changed, update the rank
      if (previousPoints !== null && pPoints < previousPoints) {
        currentRank++;
      }
      
      // If this is the user, record their rank
      if (p.id === userPlayer.id) {
        userRank = currentRank;
        console.log(`[PlayerRank] User found with rank: ${userRank}, points: ${pPoints}`);
        break;
      }
      
      previousPoints = pPoints;
    }
    
    if (userRank === null) {
      console.error(`[PlayerRank] User not found in sorted players list!`);
      return apiSuccess({
        rank: null,
        total_points: userPlayer.total_points ?? 0,
      });
    }

    console.log(`[PlayerRank] Final rank: ${userRank}`);

    return apiSuccess({
      rank: userRank,
      total_points: userPlayer.total_points ?? 0,
    });
  } catch (error) {
    console.error("Player rank API error:", error);
    return apiError("Failed to get player rank", 500);
  }
}
