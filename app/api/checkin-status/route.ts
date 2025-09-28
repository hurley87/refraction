import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getCheckinByAddressAndCheckpoint,
  supabase,
} from "@/lib/supabase";

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

    const checkins = await getCheckinByAddressAndCheckpoint(address, checkpoint);
    const hasCheckedIn = checkins && checkins.length > 0;

    const { startIso, endIso } = getUtcDayBounds();

    const [dailyActivityResult, checkpointActivityResult] = await Promise.all([
      supabase
        .from("points_activities")
        .select("id, points_earned")
        .eq("user_wallet_address", address)
        .eq("activity_type", "daily_checkin")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1),
      supabase
        .from("points_activities")
        .select("id")
        .eq("user_wallet_address", address)
        .eq("activity_type", "checkpoint_checkin")
        .contains("metadata", { checkpoint })
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1),
    ]);

    if (dailyActivityResult.error) {
      throw dailyActivityResult.error;
    }

    if (checkpointActivityResult.error) {
      throw checkpointActivityResult.error;
    }

    const dailyActivity = dailyActivityResult.data || [];
    const checkpointActivity = checkpointActivityResult.data || [];

    const dailyRewardClaimed = dailyActivity.length > 0;
    const checkpointCheckinToday = Boolean(
      checkpointActivity && checkpointActivity.length > 0
    );

    const pointsEarnedToday = dailyRewardClaimed
      ? dailyActivity?.[0]?.points_earned ?? 0
      : 0;

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
