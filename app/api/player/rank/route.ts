import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/player/rank?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Get the user's rank by counting how many players have more points
    const { data: userPlayer, error: userError } = await supabase
      .from("players")
      .select("total_points")
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

    // Get all unique scores to calculate dense ranking
    const { data: allPlayers, error: rankError } = await supabase
      .from("players")
      .select("total_points")
      .order("total_points", { ascending: false });

    if (rankError) throw rankError;

    // Calculate dense rank (tied players get same rank, next rank is sequential)
    const uniqueScores = Array.from(new Set(allPlayers.map(p => p.total_points)));
    const rank = uniqueScores.indexOf(userPlayer.total_points) + 1;

    return NextResponse.json({
      success: true,
      rank,
      total_points: userPlayer.total_points,
    });
  } catch (error) {
    console.error("Player rank API error:", error);
    return NextResponse.json(
      { error: "Failed to get player rank" },
      { status: 500 }
    );
  }
}
