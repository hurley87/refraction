import { NextRequest } from "next/server";
import {
  upsertCheckpoint,
  createOrUpdatePlayer,
  getUserProfile,
  supabase,
  type Player,
} from "@/lib/supabase";

const CHECKIN_POINTS = 100; // Points awarded for each checkin

// Award points for checkpoint checkin using Supabase directly
async function awardCheckpointPoints(
  walletAddress: string,
  checkpoint: string,
  email?: string
) {
  // Check if user has already been awarded points for this checkpoint
  const { data: existingActivity } = await supabase
    .from("points_activities")
    .select("id")
    .eq("user_wallet_address", walletAddress)
    .eq("activity_type", "checkpoint_checkin")
    .contains("metadata", { checkpoint })
    .limit(1);

  if (existingActivity && existingActivity.length > 0) {
    throw new Error(`Already awarded points for checkpoint: ${checkpoint}`);
  }

  // Award points by creating activity record
  const { data: activity, error: activityError } = await supabase
    .from("points_activities")
    .insert({
      user_wallet_address: walletAddress,
      activity_type: "checkpoint_checkin",
      points_earned: CHECKIN_POINTS,
      description: `Checked in to ${checkpoint}`,
      metadata: { checkpoint, email },
      processed: true,
    })
    .select()
    .single();

  if (activityError) {
    throw activityError;
  }

  return activity;
}

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
      total_points: 0, // Will be updated by database triggers
    };

    const player = await createOrUpdatePlayer(playerData);

    // Try to upsert the checkpoint (this will handle duplicate checking internally)
    await upsertCheckpoint(walletAddress, email, checkpoint);

    // Award points for this checkpoint checkin
    const activity = await awardCheckpointPoints(walletAddress, checkpoint, email);

    // Get updated user profile with current points
    const updatedProfile = await getUserProfile(walletAddress);
    const totalPoints = updatedProfile?.total_points || 0;

    return new Response(
      JSON.stringify({
        success: true,
        player: {
          ...player,
          total_points: totalPoints,
        },
        pointsEarned: CHECKIN_POINTS,
        activityId: activity.id,
        message: `Congratulations! You earned ${CHECKIN_POINTS} points for checking in to ${checkpoint}!`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Error processing checkin:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
