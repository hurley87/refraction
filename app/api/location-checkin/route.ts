import { NextRequest, NextResponse } from "next/server";
import {
  createOrUpdatePlayer,
  getPlayerByWallet,
  updatePlayerPoints,
} from "@/lib/db/players";
import { createOrGetLocation } from "@/lib/db/locations";
import {
  checkUserLocationCheckin,
  createLocationCheckin,
} from "@/lib/db/checkins";
import type { Player, Location } from "@/lib/types";
import { trackCheckinCompleted, trackPointsEarned } from "@/lib/analytics";
import { MAX_VARCHAR_LENGTH } from "@/lib/constants";

const sanitizeString = (
  value: unknown,
  maxLength: number = MAX_VARCHAR_LENGTH,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, username, locationData, comment, imageUrl } =
      body;

    // Validate required fields
    if (!walletAddress || !locationData) {
      return NextResponse.json(
        { error: "Wallet address and location data are required" },
        { status: 400 },
      );
    }

    // Validate location data
    const { place_id, display_name, name, lat, lon, type, context } =
      locationData;

    const sanitizedPlaceId = sanitizeString(place_id);
    const sanitizedDisplayName = sanitizeString(display_name);
    const sanitizedName =
      sanitizeString(name) ?? sanitizedDisplayName ?? sanitizeString(place_id);
    const sanitizedType = sanitizeString(type);
    const sanitizedContext =
      sanitizeString(context) ??
      (context && typeof context === "object"
        ? sanitizeString(JSON.stringify(context))
        : undefined);

    // Validate and parse latitude and longitude
    // Check that lat and lon are provided (not null/undefined) but allow 0 as valid
    if (
      lat === null ||
      lat === undefined ||
      lon === null ||
      lon === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 },
      );
    }

    const parsedLat =
      typeof lat === "string" || typeof lat === "number"
        ? parseFloat(String(lat))
        : NaN;
    const parsedLon =
      typeof lon === "string" || typeof lon === "number"
        ? parseFloat(String(lon))
        : NaN;

    if (
      !sanitizedPlaceId ||
      !sanitizedDisplayName ||
      !sanitizedName ||
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLon) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLon < -180 ||
      parsedLon > 180
    ) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 },
      );
    }

    // Create or update player
    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: username || undefined,
      total_points: 0, // Will be updated if this is a new player
    };

    const player = await createOrUpdatePlayer(playerData);

    // Create or get location
    const locationInfo: Omit<Location, "id" | "created_at"> = {
      place_id: sanitizedPlaceId,
      display_name: sanitizedDisplayName,
      name: sanitizedName,
      latitude: parsedLat,
      longitude: parsedLon,
      points_value: 100, // Each location is worth 100 points
      type: sanitizedType || "location",
      context: sanitizedContext,
      is_visible: false, // New locations require admin approval
    };

    const location = await createOrGetLocation(locationInfo);

    // Reject check-ins at hidden locations
    if (location.is_visible === false) {
      return NextResponse.json(
        { error: "This location is not available for check-ins" },
        { status: 403 },
      );
    }

    const sanitizedComment =
      typeof comment === "string" && comment.trim().length > 0
        ? comment.trim().slice(0, 500)
        : undefined;
    const sanitizedImageUrl =
      typeof imageUrl === "string" && imageUrl.trim().length > 0
        ? imageUrl.trim()
        : undefined;

    // Check if user has already checked in at this location
    const existingCheckin = await checkUserLocationCheckin(
      player.id,
      location.id,
    );

    if (existingCheckin) {
      return NextResponse.json(
        {
          error: "You have already checked in at this location",
          alreadyCheckedIn: true,
        },
        { status: 409 },
      );
    }

    // Create new checkin
    const checkin = await createLocationCheckin({
      player_id: player.id,
      location_id: location.id,
      points_earned: location.points_value,
      checkin_at: new Date().toISOString(),
      comment: sanitizedComment,
      image_url: sanitizedImageUrl,
    });

    // Update player points
    const updatedPlayer = await updatePlayerPoints(
      player.id,
      location.points_value,
    );

    // Extract city from location context if available
    let city: string | undefined;
    try {
      const context = location.context ? JSON.parse(location.context) : {};
      city = context.city;
    } catch {
      // Context parsing failed, ignore
    }

    // Track analytics events
    trackCheckinCompleted(walletAddress, {
      location_id: location.id!,
      city,
      venue: location.display_name,
      points: location.points_value,
      checkin_type: "location",
    });

    trackPointsEarned(walletAddress, {
      activity_type: "daily_checkin",
      amount: location.points_value,
      description: `Location check-in: ${location.display_name}`,
    });

    return NextResponse.json({
      success: true,
      checkin,
      player: updatedPlayer,
      location,
      pointsEarned: location.points_value,
      message: `Congratulations! You earned ${location.points_value} points!`,
    });
  } catch (error) {
    console.error("Location checkin API error:", error);
    return NextResponse.json(
      { error: "Failed to process location checkin" },
      { status: 500 },
    );
  }
}

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

    const player = await getPlayerByWallet(walletAddress);

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      player,
    });
  } catch (error) {
    console.error("Get player API error:", error);
    return NextResponse.json(
      { error: "Failed to get player data" },
      { status: 500 },
    );
  }
}
