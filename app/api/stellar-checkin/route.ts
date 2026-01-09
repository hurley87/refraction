import { NextRequest } from "next/server";
import { createOrUpdatePlayerForStellar, updatePlayerPoints } from "@/lib/db/players";
import { supabase } from "@/lib/db/client";
import { DAILY_CHECKIN_POINTS, DAILY_CHECKPOINT_LIMIT } from "@/lib/constants";
import { getUtcDayBounds } from "@/lib/utils/date";

export async function POST(req: NextRequest) {
  const { stellarWalletAddress, email, checkpoint } = await req.json();

  try {
    if (!stellarWalletAddress || !checkpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Stellar wallet address and checkpoint are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create or link player by Stellar wallet (unified by email)
    const player = await createOrUpdatePlayerForStellar(
      stellarWalletAddress,
      email,
    );

    const { startIso, endIso } = getUtcDayBounds();

    // Check daily limit using player's ID to avoid wallet format issues
    const { count: checkpointCheckinsToday, error: checkpointCountError } =
      await supabase
        .from("points_activities")
        .select("id", { count: "exact", head: true })
        .eq("metadata->>stellar_wallet", stellarWalletAddress)
        .eq("activity_type", "checkpoint_checkin")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

    if (checkpointCountError) {
      throw checkpointCountError;
    }

    if (
      checkpointCheckinsToday !== null &&
      checkpointCheckinsToday >= DAILY_CHECKPOINT_LIMIT
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Daily checkpoint limit of ${DAILY_CHECKPOINT_LIMIT} reached. Come back tomorrow!`,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let pointsAwarded = 0;
    let latestPlayer = player;

    // Insert points activity with chain metadata
    // Use EVM wallet if available, otherwise store without user_wallet_address
    const activityData: Record<string, unknown> = {
      activity_type: "checkpoint_checkin",
      points_earned: DAILY_CHECKIN_POINTS,
      description: `Stellar checkpoint visit: ${checkpoint}`,
      metadata: {
        checkpoint,
        email,
        chain: "stellar",
        stellar_wallet: stellarWalletAddress,
        player_id: player.id,
      },
      processed: true,
    };

    // Only set user_wallet_address if player has an EVM wallet (to satisfy constraint)
    if (player.wallet_address) {
      activityData.user_wallet_address = player.wallet_address;
    }

    const { data: checkpointActivity, error: checkpointActivityError } =
      await supabase
        .from("points_activities")
        .insert(activityData)
        .select()
        .single();

    if (checkpointActivityError) {
      throw checkpointActivityError;
    }

    const checkpointActivityId = checkpointActivity?.id;
    pointsAwarded = DAILY_CHECKIN_POINTS;

    if (latestPlayer?.id) {
      latestPlayer = await updatePlayerPoints(latestPlayer.id, pointsAwarded);
    }

    // Get today's total points by Stellar wallet
    const { data: todaysCheckpoints, error: checkpointsSumError } =
      await supabase
        .from("points_activities")
        .select("points_earned")
        .eq("metadata->>stellar_wallet", stellarWalletAddress)
        .eq("activity_type", "checkpoint_checkin")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

    if (checkpointsSumError) {
      throw checkpointsSumError;
    }

    const pointsEarnedToday =
      todaysCheckpoints?.reduce(
        (sum, activity) => sum + (activity.points_earned ?? 0),
        0,
      ) ?? pointsAwarded;

    const totalPoints = latestPlayer?.total_points || 0;
    const responsePlayer = latestPlayer
      ? { ...latestPlayer, total_points: totalPoints }
      : { ...player, total_points: totalPoints };

    return new Response(
      JSON.stringify({
        success: true,
        player: responsePlayer,
        pointsAwarded,
        pointsEarnedToday,
        dailyRewardClaimed: pointsEarnedToday > 0,
        checkpointActivityId,
        message: `Nice! You earned ${pointsAwarded} points for this Stellar checkpoint.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Error processing Stellar checkin:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}


