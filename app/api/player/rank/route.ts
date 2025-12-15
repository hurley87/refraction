import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Extended timeout
export const revalidate = 60; // Cache for 60 seconds

// GET /api/player/rank?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
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
        return NextResponse.json({
          success: true,
          rank: null,
          total_points: 0,
        });
      }
      throw userError;
    }

    // Calculate rank by counting how many players come before this user
    // Using the same ordering as leaderboard: ORDER BY total_points DESC, id ASC
    // This means we count players with:
    // 1. More points, OR
    // 2. Equal points but lower id
    const { data: allPlayers, error: rankError } = await supabase
      .from("players")
      .select("id, total_points")
      .order("total_points", { ascending: false })
      .order("id", { ascending: true });

    if (rankError) throw rankError;

    // Find the user's position in the ordered list
    const userIndex = allPlayers.findIndex((p) => p.id === userPlayer.id);

    // If user not found in list, something is wrong
    if (userIndex === -1) {
      return NextResponse.json({
        success: true,
        rank: null,
        total_points: userPlayer.total_points,
      });
    }

    const rank = userIndex + 1;

    return NextResponse.json({
      success: true,
      rank,
      total_points: userPlayer.total_points,
    });
  } catch (error) {
    console.error("Player rank API error:", error);
    return NextResponse.json(
      { error: "Failed to get player rank" },
      { status: 500 },
    );
  }
}
