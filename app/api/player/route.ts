import { NextRequest } from "next/server";
import { createOrUpdatePlayer, getPlayerByWallet } from "@/lib/db/players";
import type { Player } from "@/lib/types";
import {
  createPlayerRequestSchema,
  getPlayerRequestSchema,
  updatePlayerRequestSchema,
} from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createPlayerRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, email, username } = validationResult.data;

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
          createdAt: player.created_at,
          email: player.email ?? "",
        }),
      });
    } catch (airtableSyncError) {
      console.error("Failed to sync user to Airtable:", airtableSyncError);
      // We log the error but do NOT block the main response
    }

    return apiSuccess(
      { player },
      `Welcome ${username}! Your player profile has been created.`,
    );
  } catch (error) {
    console.error("Player creation API error:", error);
    return apiError("Failed to create player profile", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    const validationResult = getPlayerRequestSchema.safeParse({
      walletAddress,
    });

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const player = await getPlayerByWallet(validationResult.data.walletAddress);

    if (!player) {
      return apiError("Player not found", 404);
    }

    return apiSuccess({ player });
  } catch (error) {
    console.error("Get player API error:", error);
    return apiError("Failed to get player data", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = updatePlayerRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, username } = validationResult.data;

    // Get existing player
    const existingPlayer = await getPlayerByWallet(walletAddress);

    if (!existingPlayer) {
      return apiError("Player not found", 404);
    }

    // Update player
    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: existingPlayer.email,
      username: username.trim(),
      total_points: existingPlayer.total_points,
    };

    const updatedPlayer = await createOrUpdatePlayer(playerData);

    return apiSuccess(
      { player: updatedPlayer },
      `Username updated to ${username}!`,
    );
  } catch (error) {
    console.error("Player update API error:", error);
    return apiError("Failed to update player profile", 500);
  }
}
