import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    // Base query
    const query = supabase.from("locations").select("*");

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

          const playerRel: any = (firstCheckin as any)?.players;
          const creator = Array.isArray(playerRel) ? playerRel[0] : playerRel;

          return {
            ...loc,
            creator_wallet_address: creator?.wallet_address || null,
            creator_username: creator?.username || null,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      place_id,
      display_name,
      name,
      lat,
      lon,
      type,
      coinAddress,
      coinMetadata,
      transactionHash,
      coinSymbol,
      coinName,
      walletAddress,
      username,
      coinImageUrl,
    } = body;

    // Validate required fields
    if (!place_id || !display_name || !name || !lat || !lon) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Insert the new location
    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .insert({
        place_id,
        display_name,
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        type: type || "location",
        points_value: 100, // Default points value
        coin_address: coinAddress || null,
        coin_transaction_hash: transactionHash || null,
        coin_symbol: coinSymbol || null,
        coin_name: coinName || null,
        coin_image_url: coinImageUrl || null,
        creator_wallet_address: walletAddress || null,
        creator_username: username || null,
        context: JSON.stringify({
          coinAddress: coinAddress || null,
          coinMetadata: coinMetadata || null,
          transactionHash: transactionHash || null,
          coinImageUrl: coinImageUrl || null,
        }),
      })
      .select()
      .single();

    if (locationError) throw locationError;

    return NextResponse.json({
      success: true,
      location: locationData,
    });
  } catch (error) {
    console.error("Create location API error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
