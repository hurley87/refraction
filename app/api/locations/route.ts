import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    // Base query
    const query = supabase
      .from("locations")
      .select(
        "id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username",
      );

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
            id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username
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

    return NextResponse.json({ locations: data || [] });
  } catch (error) {
    console.error("Locations API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

const getUtcDayBounds = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

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
      walletAddress,
      username,
    } = body;

    // Validate required fields
    if (!place_id || !display_name || !name || !lat || !lon || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if user has already created a location today
    const { startIso, endIso } = getUtcDayBounds();
    const { data: existingLocations, error: checkError } = await supabase
      .from("locations")
      .select("id")
      .eq("creator_wallet_address", walletAddress)
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (checkError) {
      console.error("Error checking existing locations:", checkError);
      throw checkError;
    }

    if (existingLocations && existingLocations.length > 0) {
      return NextResponse.json(
        { error: "You can only add one location per day. Come back tomorrow!" },
        { status: 429 },
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
        points_value: 100,
        creator_wallet_address: walletAddress,
        creator_username: username || null,
        context: JSON.stringify({
          created_at: new Date().toISOString(),
        }),
      })
      .select()
      .single();

    if (locationError) throw locationError;

    // Award 100 points to the user for creating a location
    const pointsAwarded = 100;

    const { error: pointsError } = await supabase
      .from("points_activities")
      .insert({
        user_wallet_address: walletAddress,
        activity_type: "location_creation",
        points_earned: pointsAwarded,
        description: `Created location: ${name}`,
        metadata: {
          location_id: locationData.id,
          location_name: name,
          place_id,
        },
        processed: true,
      });

    if (pointsError) {
      console.error("Error awarding points:", pointsError);
      // Don't fail the location creation if points fail
    }

    return NextResponse.json({
      success: true,
      location: locationData,
      pointsAwarded,
    });
  } catch (error) {
    console.error("Create location API error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
