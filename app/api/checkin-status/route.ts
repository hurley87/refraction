import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { supabase } from "@/lib/db/client";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const checkpoint = searchParams.get("checkpoint");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    if (!checkpoint) {
      return NextResponse.json(
        { error: "Checkpoint parameter is required" },
        { status: 400 }
      );
    }

    const { startIso, endIso } = getUtcDayBounds();

    const [todaysCheckpointActivities, checkpointActivityResult, allTimeCheckpointResult] = await Promise.all([
      supabase
        .from("points_activities")
        .select("points_earned")
        .eq("user_wallet_address", address)
        .eq("activity_type", "checkpoint_checkin")
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      supabase
        .from("points_activities")
        .select("id")
        .eq("user_wallet_address", address)
        .eq("activity_type", "checkpoint_checkin")
        .contains("metadata", { checkpoint })
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1),
      // Check if user has ever checked in at this checkpoint (all time)
      supabase
        .from("points_activities")
        .select("id")
        .eq("user_wallet_address", address)
        .eq("activity_type", "checkpoint_checkin")
        .contains("metadata", { checkpoint })
        .limit(1),
    ]);

    const hasCheckedIn = (allTimeCheckpointResult.data?.length ?? 0) > 0;

    if (todaysCheckpointActivities.error) {
      throw todaysCheckpointActivities.error;
    }

    if (checkpointActivityResult.error) {
      throw checkpointActivityResult.error;
    }

    if (allTimeCheckpointResult.error) {
      throw allTimeCheckpointResult.error;
    }

    const todaysActivities = todaysCheckpointActivities.data || [];
    const checkpointActivity = checkpointActivityResult.data || [];

    const pointsEarnedToday = todaysActivities.reduce(
      (sum, activity) => sum + (activity.points_earned ?? 0),
      0,
    );

    const dailyRewardClaimed = pointsEarnedToday > 0;
    const checkpointCheckinToday = Boolean(
      checkpointActivity && checkpointActivity.length > 0
    );

    return NextResponse.json({
      hasCheckedIn,
      checkpointCheckinToday,
      dailyRewardClaimed,
      pointsEarnedToday,
    });
  } catch (error) {
    console.error("Error checking check-in status:", error);
    return NextResponse.json(
      { error: "Failed to check check-in status" },
      { status: 500 }
    );
  }
}
