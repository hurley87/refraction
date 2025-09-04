import { NextRequest, NextResponse } from "next/server";
import { createOrUpdatePlayer, createOrGetLocation, type Location } from "@/lib/supabase";
// import { createLocationCoin } from "@/lib/zora-coins";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      walletAddress, 
      locationData, 
      createCoin = true,
      username 
    } = body;

    // Validate required fields
    if (!walletAddress || !locationData) {
      return NextResponse.json(
        { error: "Wallet address and location data are required" },
        { status: 400 }
      );
    }

    const { place_id, display_name, name, lat, lon, type, context } = locationData;

    if (!place_id || !display_name || !lat || !lon) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 }
      );
    }

    // Create or update player first
    const player = await createOrUpdatePlayer({
      wallet_address: walletAddress,
      username: username || undefined,
      total_points: 0
    });

    let coinAddress: string | undefined;
    let coinSymbol: string | undefined;
    let coinName: string | undefined;
    let coinTransactionHash: string | undefined;

    // Create coin if requested (this will be done on the frontend)
    if (createCoin) {
      // Note: Actual coin creation happens on frontend with user's wallet
      // This is just a placeholder for the coin data that will be passed back
      const locationName = name || display_name;
      coinSymbol = generateCoinSymbol(locationName);
      coinName = `${locationName} Coin`;
    }

    // Create location with coin information
    const locationInfo: Omit<Location, "id" | "created_at"> = {
      place_id,
      display_name,
      name: name || display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      points_value: 100,
      type: type || "location",
      context: context || undefined,
      coin_address: coinAddress,
      coin_symbol: coinSymbol,
      coin_name: coinName,
      coin_transaction_hash: coinTransactionHash,
      creator_wallet_address: walletAddress,
      creator_username: username || player.username || undefined
    };

    const location = await createOrGetLocation(locationInfo);

    return NextResponse.json({
      success: true,
      location,
      player,
      shouldCreateCoin: createCoin,
      coinInfo: createCoin ? {
        symbol: coinSymbol,
        name: coinName,
        locationName: name || display_name,
        description: `Location coin for ${display_name}`
      } : undefined
    });

  } catch (error) {
    console.error("Create location with coin API error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

// Helper function to generate coin symbol
function generateCoinSymbol(locationName: string): string {
  const cleaned = locationName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = cleaned.slice(0, 4).padEnd(4, 'X');
  return `${prefix}LOC`;
}

// Update location with coin information after coin is created
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      locationId, 
      coinAddress, 
      coinTransactionHash 
    } = body;

    if (!locationId || !coinAddress) {
      return NextResponse.json(
        { error: "Location ID and coin address are required" },
        { status: 400 }
      );
    }

    // Update location with coin information
    const { supabase } = await import("@/lib/supabase");
    
    const { data, error } = await supabase
      .from("locations")
      .update({
        coin_address: coinAddress,
        coin_transaction_hash: coinTransactionHash
      })
      .eq("id", locationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      location: data
    });

  } catch (error) {
    console.error("Update location coin API error:", error);
    return NextResponse.json(
      { error: "Failed to update location with coin information" },
      { status: 500 }
    );
  }
}