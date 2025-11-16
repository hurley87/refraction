import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_VARCHAR_LENGTH = 255;
const MAX_LOCATIONS_PER_DAY = 5;

const sanitizeVarchar = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > MAX_VARCHAR_LENGTH
    ? trimmed.slice(0, MAX_VARCHAR_LENGTH)
    : trimmed;
};

const sanitizeOptionalVarchar = (value?: string | null) => {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_VARCHAR_LENGTH
    ? trimmed.slice(0, MAX_VARCHAR_LENGTH)
    : trimmed;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    // Base query - only return locations with images
    const query = supabase
      .from("locations")
      .select(
        "id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username",
      )
      .not("coin_image_url", "is", null);

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
          locations!inner (
            id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username
          )
        `,
        )
        .eq("player_id", player.id)
        .not("locations.coin_image_url", "is", null);

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

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";

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
      locationImage,
    } = body;

    // Validate required fields
    if (
      typeof place_id !== "string" ||
      !place_id.trim() ||
      typeof display_name !== "string" ||
      !display_name.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      !lat ||
      !lon ||
      typeof walletAddress !== "string" ||
      !walletAddress.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate that locationImage is provided (required since GET endpoint filters by it)
    if (
      !locationImage ||
      typeof locationImage !== "string" ||
      locationImage.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Location image is required" },
        { status: 400 },
      );
    }

    const sanitizedPlaceId = sanitizeVarchar(place_id);
    const sanitizedDisplayName = sanitizeVarchar(display_name);
    const sanitizedName = sanitizeVarchar(name);
    const sanitizedType =
      typeof type === "string" && type.trim()
        ? sanitizeVarchar(type)
        : "location";
    const sanitizedWalletAddress = walletAddress.trim();
    const sanitizedUsername = sanitizeOptionalVarchar(username);
    const normalizedLocationImage = locationImage.trim();

    // Ensure location doesn't already exist before proceeding
    const { data: existingLocation, error: locationLookupError } =
      await supabase
        .from("locations")
        .select(
          "id, name, display_name, creator_wallet_address, creator_username, coin_image_url, latitude, longitude",
        )
        .eq("place_id", sanitizedPlaceId)
        .maybeSingle();

    if (locationLookupError && locationLookupError.code !== "PGRST116") {
      console.error("Error checking duplicate location:", locationLookupError);
      throw locationLookupError;
    }

    if (existingLocation) {
      return NextResponse.json(
        {
          error: "Location already exists for this place_id",
          location: existingLocation,
        },
        { status: 409 },
      );
    }

    // Check if user has already created a location today
    const { startIso, endIso } = getUtcDayBounds();
    const { data: existingLocations, error: checkError } = await supabase
      .from("locations")
      .select("id")
      .eq("creator_wallet_address", sanitizedWalletAddress)
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (checkError) {
      console.error("Error checking existing locations:", checkError);
      throw checkError;
    }

    if (
      existingLocations &&
      existingLocations.length >= MAX_LOCATIONS_PER_DAY
    ) {
      return NextResponse.json(
        {
          error: "You can only add five locations per day. Come back tomorrow!",
        },
        { status: 429 },
      );
    }

    // Insert the new location
    const locationInsertPayload = {
      place_id: sanitizedPlaceId,
      display_name: sanitizedDisplayName,
      name: sanitizedName,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      type: sanitizedType,
      points_value: 100,
      creator_wallet_address: sanitizedWalletAddress,
      creator_username: sanitizedUsername,
      coin_image_url: normalizedLocationImage,
      context: JSON.stringify({
        created_at: new Date().toISOString(),
      }),
    };

    console.log("Creating location with payload:", locationInsertPayload);

    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .insert(locationInsertPayload)
      .select()
      .single();

    if (locationError) {
      if (isDuplicateKeyError(locationError)) {
        return NextResponse.json(
          { error: "Location already exists for this place_id" },
          { status: 409 },
        );
      }
      throw locationError;
    }

    // Award 100 points to the user for creating a location
    const pointsAwarded = 100;

    const { error: pointsError } = await supabase
      .from("points_activities")
      .insert({
        user_wallet_address: sanitizedWalletAddress,
        activity_type: "location_creation",
        points_earned: pointsAwarded,
        description: `Created location: ${sanitizedName}`,
        metadata: {
          location_id: locationData.id,
          location_name: sanitizedName,
          place_id: sanitizedPlaceId,
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
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: "Location already exists for this place_id" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
