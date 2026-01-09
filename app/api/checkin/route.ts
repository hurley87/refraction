import { NextRequest } from "next/server";
import { createOrUpdatePlayer, updatePlayerPoints } from "@/lib/db/players";
import { getUserProfile } from "@/lib/db/profiles";
import { supabase } from "@/lib/db/client";
import type { Player } from "@/lib/types";
import { checkinRequestSchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";
import { trackCheckinCompleted, trackPointsEarned } from "@/lib/analytics";
import { DAILY_CHECKIN_POINTS, DAILY_CHECKPOINT_LIMIT } from "@/lib/constants";

const getUtcDayBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = checkinRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, email, checkpoint } = validationResult.data;

    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: undefined,
      total_points: 0,
    };

    const player = await createOrUpdatePlayer(playerData);

    const { startIso, endIso } = getUtcDayBounds();

    const { count: checkpointCheckinsToday, error: checkpointCountError } =
      await supabase
        .from("points_activities")
        .select("id", { count: "exact", head: true })
        .eq("user_wallet_address", walletAddress)
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
      return apiError(
        `Daily checkpoint limit of ${DAILY_CHECKPOINT_LIMIT} reached. Come back tomorrow!`,
        429,
      );
    }

    let pointsAwarded = 0;
    let latestPlayer = player;

    const {
      data: checkpointActivity,
      error: checkpointActivityError,
    } = await supabase
      .from("points_activities")
      .insert({
        user_wallet_address: walletAddress,
        activity_type: "checkpoint_checkin",
        points_earned: DAILY_CHECKIN_POINTS,
        description: `Checkpoint visit: ${checkpoint}`,
        metadata: { checkpoint, email },
        processed: true,
      })
      .select()
      .single();

    if (checkpointActivityError) {
      throw checkpointActivityError;
    }

    const checkpointActivityId = checkpointActivity?.id;
    pointsAwarded = DAILY_CHECKIN_POINTS;

    if (latestPlayer?.id) {
      latestPlayer = await updatePlayerPoints(latestPlayer.id, pointsAwarded);
    } else {
      const updatedProfile = await getUserProfile(walletAddress);
      if (updatedProfile) {
        latestPlayer = updatedProfile;
      }
    }

    const { data: todaysCheckpoints, error: checkpointsSumError } = await supabase
      .from("points_activities")
      .select("points_earned")
      .eq("user_wallet_address", walletAddress)
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

    // Track analytics events
    trackCheckinCompleted(walletAddress, {
      location_id: 0, // Checkpoint doesn't have location_id
      checkpoint,
      points: pointsAwarded,
      checkin_type: "checkpoint",
    });

    trackPointsEarned(walletAddress, {
      activity_type: "checkpoint_checkin",
      amount: pointsAwarded,
      description: `Checkpoint visit: ${checkpoint}`,
    });

    return apiSuccess(
      {
        player: responsePlayer,
        pointsAwarded,
        pointsEarnedToday,
        dailyRewardClaimed: pointsEarnedToday > 0,
        checkpointActivityId,
      },
      `Nice! You earned ${pointsAwarded} points for this checkpoint.`,
    );
  } catch (e) {
    console.error("Error processing checkin:", e);
    let errorMessage = "Unknown error";
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === "object" && e !== null && "message" in e) {
      errorMessage = String((e as { message: unknown }).message);
    } else if (typeof e === "string") {
      errorMessage = e;
    }
    return apiError(errorMessage, 500);
  }
}
