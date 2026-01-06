import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { trackLocationCreated, trackPointsEarned } from "@/lib/analytics";
import { checkAdminPermission } from "@/lib/auth";

const MAX_VARCHAR_LENGTH = 255;
const MAX_LOCATIONS_PER_DAY = 30;

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
    const includeHidden = searchParams.get("includeHidden") === "true";

    // Only allow includeHidden if admin
    if (includeHidden) {
      const adminEmail = request.headers.get("x-user-email");
      if (!checkAdminPermission(adminEmail || undefined)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Base query - only return locations with images
    let query = supabase
      .from("locations")
      .select(
        "id, name, display_name, description, latitude, longitude, place_id, points_value, type, event_url, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username, is_visible",
      )
      .not("coin_image_url", "is", null);

    // Filter by visibility unless admin requested all
    if (!includeHidden) {
      query = query.eq("is_visible", true);
    }

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

      let checkinQuery = supabase
        .from("player_location_checkins")
        .select(
          `
          locations!inner (
            id, name, display_name, description, latitude, longitude, place_id, points_value, type, event_url, context, created_at, coin_address, coin_name, coin_symbol, coin_image_url, creator_wallet_address, creator_username, is_visible
          )
        `,
        )
        .eq("player_id", player.id)
        .not("locations.coin_image_url", "is", null);

      // Filter by visibility unless admin requested all
      if (!includeHidden) {
        checkinQuery = checkinQuery.eq("locations.is_visible", true);
      }

      const { data, error } = await checkinQuery;

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
      description,
      lat,
      lon,
      type,
      eventUrl,
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
    const sanitizedDescription = sanitizeOptionalVarchar(description);
    const sanitizedType =
      typeof type === "string" && type.trim()
        ? sanitizeVarchar(type)
        : "location";

    // Validate and sanitize eventUrl - must be a valid URL if provided
    let sanitizedEventUrl: string | null = null;
    if (eventUrl && typeof eventUrl === "string") {
      const trimmed = eventUrl.trim();
      if (trimmed) {
        try {
          // Validate URL format to prevent XSS attacks
          const url = new URL(trimmed);
          // Only allow http/https protocols for security
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return NextResponse.json(
              { error: "Event URL must use http or https protocol" },
              { status: 400 },
            );
          }
          sanitizedEventUrl = sanitizeOptionalVarchar(trimmed);
        } catch {
          return NextResponse.json(
            { error: "Invalid event URL format" },
            { status: 400 },
          );
        }
      }
    }

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
          error: "You can only add 30 locations per day. Come back tomorrow!",
        },
        { status: 429 },
      );
    }

    // Insert the new location (hidden by default, requires admin approval)
    const locationInsertPayload = {
      place_id: sanitizedPlaceId,
      display_name: sanitizedDisplayName,
      name: sanitizedName,
      description: sanitizedDescription,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      type: sanitizedType,
      event_url: sanitizedEventUrl,
      points_value: 100,
      creator_wallet_address: sanitizedWalletAddress,
      creator_username: sanitizedUsername,
      coin_image_url: normalizedLocationImage,
      is_visible: false,
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

    // Extract city from context if available, or try to parse from display_name
    let city: string | undefined;
    let country: string | undefined;
    try {
      const context = locationData.context
        ? JSON.parse(locationData.context)
        : {};
      city = context.city;
      country = context.country;
    } catch {
      // Context parsing failed, ignore
    }

    // Track location creation
    trackLocationCreated(sanitizedWalletAddress, {
      location_id: locationData.id!,
      city,
      country,
      place_id: sanitizedPlaceId,
      type: sanitizedType,
      creator_wallet_address: sanitizedWalletAddress,
    });

    // Track points earned
    trackPointsEarned(sanitizedWalletAddress, {
      activity_type: "location_creation",
      amount: pointsAwarded,
      description: `Created location: ${sanitizedName}`,
    });

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
