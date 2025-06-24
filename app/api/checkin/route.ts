import { NextRequest } from "next/server";
import {
  upsertCheckpoint,
  createOrUpdatePlayer,
  updatePlayerPoints,
  type Player,
} from "@/lib/supabase";

const CHECKIN_POINTS = 100; // Points awarded for each checkin

export async function POST(req: NextRequest) {
  const { walletAddress, email, checkpoint } = await req.json();

  console.log("walletAddress", walletAddress);
  console.log("email", email);
  console.log("checkpoint", checkpoint);

  try {
    // Create or update player record first
    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: undefined, // No username provided in regular checkins
      total_points: 0, // Will be updated if this is a new player
    };

    const player = await createOrUpdatePlayer(playerData);

    // Try to upsert the checkpoint (this will handle duplicate checking internally)
    await upsertCheckpoint(walletAddress, email, checkpoint);

    // Award points to the player
    const updatedPlayer = await updatePlayerPoints(player.id, CHECKIN_POINTS);

    return new Response(
      JSON.stringify({
        success: true,
        player: updatedPlayer,
        pointsEarned: CHECKIN_POINTS,
        message: `Congratulations! You earned ${CHECKIN_POINTS} points for checking in to ${checkpoint}!`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error(e);

    // Check if it's a duplicate checkpoint error
    if (e instanceof Error && e.message.includes("Already checked in to")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: e.message,
        }),
        {
          status: 409, // Conflict status code
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
