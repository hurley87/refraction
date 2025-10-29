import { NextRequest, NextResponse } from "next/server";
import {
  createOrUpdatePlayer,
  createOrGetLocation,
  checkUserLocationCheckin,
  createLocationCheckin,
  updatePlayerPoints,
  getPlayerByWallet,
  type Player,
  type Location,
} from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      email,
      username,
      locationData,
      comment,
      imageUrl,
    } = body;

    // Validate required fields
    if (!walletAddress || !locationData) {
      return NextResponse.json(
        { error: "Wallet address and location data are required" },
        { status: 400 }
      );
    }

    // Validate location data
    const { place_id, display_name, name, lat, lon, type, context } =
      locationData;

    if (!place_id || !display_name || !lat || !lon) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 }
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
      place_id,
      display_name,
      name: name || display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      points_value: 100, // Each location is worth 100 points
      type: type || "location",
      context: context || undefined,
    };

    const location = await createOrGetLocation(locationInfo);

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
      location.id
    );

    if (existingCheckin) {
      return NextResponse.json(
        {
          error: "You have already checked in at this location",
          alreadyCheckedIn: true,
        },
        { status: 409 }
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
      location.points_value
    );

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
      { status: 500 }
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
        { status: 400 }
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
      { status: 500 }
    );
  }
}
