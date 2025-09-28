import { NextRequest } from "next/server";
import {
  upsertCheckpoint,
  createOrUpdatePlayer,
  getUserProfile,
  supabase,
  type Player,
} from "@/lib/supabase";

const DAILY_CHECKIN_POINTS = 100;

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

    try {
      await upsertCheckpoint(walletAddress, email, checkpoint);
    } catch (error) {
      if (
        !(error instanceof Error && error.message.includes("Already checked in"))
      ) {
        throw error;
      }
    }

    const { startIso, endIso } = getUtcDayBounds();

    const { data: existingCheckpointActivity, error: existingCheckpointError } =
      await supabase
        .from("points_activities")
        .select("id")
        .eq("user_wallet_address", walletAddress)
        .eq("activity_type", "checkpoint_checkin")
        .contains("metadata", { checkpoint })
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1);

    if (existingCheckpointError) {
      throw existingCheckpointError;
    }

    let checkpointActivityId: string | undefined;

    if (!existingCheckpointActivity || existingCheckpointActivity.length === 0) {
      const {
        data: checkpointActivity,
        error: checkpointActivityError,
      } = await supabase
        .from("points_activities")
        .insert({
          user_wallet_address: walletAddress,
          activity_type: "checkpoint_checkin",
          points_earned: 0,
          description: `Checkpoint visit: ${checkpoint}`,
          metadata: { checkpoint, email },
          processed: true,
        })
        .select()
        .single();

      if (checkpointActivityError) {
        throw checkpointActivityError;
      }

      checkpointActivityId = checkpointActivity?.id;
    } else {
      checkpointActivityId = existingCheckpointActivity[0].id;
    }

    const { data: existingDailyActivity, error: existingDailyError } =
      await supabase
        .from("points_activities")
        .select("id, points_earned")
        .eq("user_wallet_address", walletAddress)
        .eq("activity_type", "daily_checkin")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1);

    if (existingDailyError) {
      throw existingDailyError;
    }

    let pointsAwarded = 0;
    let pointsEarnedToday = existingDailyActivity?.[0]?.points_earned ?? 0;
    let dailyActivityId: string | undefined;

    if (!existingDailyActivity || existingDailyActivity.length === 0) {
      const { data: dailyActivity, error: dailyActivityError } = await supabase
        .from("points_activities")
        .insert({
          user_wallet_address: walletAddress,
          activity_type: "daily_checkin",
          points_earned: DAILY_CHECKIN_POINTS,
          description: `Daily check-in via ${checkpoint}`,
          metadata: { checkpoint, email },
          processed: true,
        })
        .select()
        .single();

      if (dailyActivityError) {
        throw dailyActivityError;
      }

      pointsAwarded = DAILY_CHECKIN_POINTS;
      pointsEarnedToday = DAILY_CHECKIN_POINTS;
      dailyActivityId = dailyActivity?.id;
    } else {
      dailyActivityId = existingDailyActivity[0].id;
      pointsEarnedToday = existingDailyActivity[0].points_earned ?? 0;
    }

    const updatedProfile = await getUserProfile(walletAddress);
    const totalPoints = updatedProfile?.total_points || 0;

    return new Response(
      JSON.stringify({
        success: true,
        player: {
          ...player,
          total_points: totalPoints,
        },
        pointsAwarded,
        pointsEarnedToday,
        dailyRewardClaimed: pointsEarnedToday >= DAILY_CHECKIN_POINTS,
        checkpointActivityId,
        dailyActivityId,
        message:
          pointsAwarded >= DAILY_CHECKIN_POINTS
            ? `Congratulations! You earned ${DAILY_CHECKIN_POINTS} points for today's check-in!`
            : "Daily check-in already completed. Come back tomorrow!",
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
