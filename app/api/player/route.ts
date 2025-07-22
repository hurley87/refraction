import { NextRequest, NextResponse } from "next/server";
import {
  createOrUpdatePlayer,
  getPlayerByWallet,
  type Player,
} from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, username } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
    }

    if (!username || username.trim().length < 1) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // Create or update player
    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: username.trim(),
      total_points: 0,
    };

    const player = await createOrUpdatePlayer(playerData);

    // === Sync the player data to Airtable via internal API ===
    try {
      // Derive the base URL (e.g., https://example.com) from the incoming request
      const baseUrl = new URL(request.url).origin;
      await fetch(`${baseUrl}/api/add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: player.id,
          createdAt: player.created_at,
          ethAddress: player.wallet_address,
          email: player.email ?? "",
        }),
      });
    } catch (airtableSyncError) {
      console.error("Failed to sync user to Airtable:", airtableSyncError);
      // We log the error but do NOT block the main response
    }

    return NextResponse.json({
      success: true,
      player,
      message: `Welcome ${username}! Your player profile has been created.`,
    });
  } catch (error) {
    console.error("Player creation API error:", error);
    return NextResponse.json(
      { error: "Failed to create player profile" },
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
    }

    if (!username || username.trim().length < 1) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // Get existing player
    const existingPlayer = await getPlayerByWallet(walletAddress);

    if (!existingPlayer) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Update player
    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: existingPlayer.email,
      username: username.trim(),
      total_points: existingPlayer.total_points,
    };

    const updatedPlayer = await createOrUpdatePlayer(playerData);

    return NextResponse.json({
      success: true,
      player: updatedPlayer,
      message: `Username updated to ${username}!`,
    });
  } catch (error) {
    console.error("Player update API error:", error);
    return NextResponse.json(
      { error: "Failed to update player profile" },
      { status: 500 },
    );
  }
}
