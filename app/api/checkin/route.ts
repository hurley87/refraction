import { NextRequest } from "next/server";
import {
  upsertCheckpoint,
  createOrUpdatePlayer,
  getUserProfile,
  updatePlayerPoints,
  supabase,
  type Player,
} from "@/lib/supabase";

const DAILY_CHECKIN_POINTS = 100;
const DAILY_CHECKPOINT_LIMIT = 10;

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
  const { walletAddress, email, checkpoint } = await req.json();

  try {
    if (!walletAddress || !checkpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Wallet address and checkpoint are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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
      return new Response(
        JSON.stringify({
          success: false,
          error: `Daily checkpoint limit of ${DAILY_CHECKPOINT_LIMIT} reached. Come back tomorrow!`,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      await upsertCheckpoint(walletAddress, email, checkpoint);
    } catch (error) {
      if (
        !(error instanceof Error && error.message.includes("Already checked in"))
      ) {
        throw error;
      }
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

    return new Response(
      JSON.stringify({
        success: true,
        player: responsePlayer,
        pointsAwarded,
        pointsEarnedToday,
        dailyRewardClaimed: pointsEarnedToday > 0,
        checkpointActivityId,
        message: `Nice! You earned ${pointsAwarded} points for this checkpoint.`,
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
