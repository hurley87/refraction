import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    // Base query
    let query = supabase.from("locations").select("*");

    // If filtering by player's check-ins, join through player_location_checkins
    if (walletAddress) {
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (playerError) {
        if (playerError.code === "PGRST116") {
          return NextResponse.json({ locations: [] });
        }
        throw playerError;
      }

      const { data, error } = await supabase
        .from("player_location_checkins")
        .select(
          `
          locations (
            id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at
          )
        `,
        )
        .eq("player_id", player.id);

      if (error) throw error;

      const locations = (data || [])
        .map((row: any) => row.locations)
        .filter(Boolean);

      return NextResponse.json({ locations });
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach creator info (first check-in's player) per location
    const locationsWithCreator = await Promise.all(
      (data || []).map(async (loc: any) => {
        try {
          const { data: firstCheckin } = await supabase
            .from("player_location_checkins")
            .select(
              `player_id, created_at, players ( wallet_address, username )`,
            )
            .eq("location_id", loc.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...loc,
            creator_wallet_address:
              firstCheckin?.players?.wallet_address || null,
            creator_username: firstCheckin?.players?.username || null,
          };
        } catch {
          return { ...loc };
        }
      }),
    );

    return NextResponse.json({ locations: locationsWithCreator });
  } catch (error) {
    console.error("Locations API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}
