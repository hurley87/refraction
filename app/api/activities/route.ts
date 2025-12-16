import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { supabase } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
    }

    // Fetch user activities from points_activities table
    const { data: activities, error } = await supabase
      .from("points_activities")
      .select("*")
      .eq("user_wallet_address", walletAddress)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activities:", error);
      return NextResponse.json(
        { error: "Failed to fetch activities" },
        { status: 500 },
      );
    }

    // Transform the activities to a more readable format
    const formattedActivities =
      activities?.map((activity) => {
        const date = new Date(activity.created_at);
        // Format date as M/D/YY (e.g., 1/15/25 instead of 1/15/2025)
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
        const formattedDate = `${month}/${day}/${year}`;
        
        return {
          id: activity.id,
          date: formattedDate,
          description: activity.description,
          activityType: activity.activity_type,
          points: activity.points_earned,
          event: getEventName(activity.activity_type),
          metadata: activity.metadata,
        };
      }) || [];

    return NextResponse.json(formattedActivities, { status: 200 });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 },
    );
  }
}

// Helper function to get readable event names
function getEventName(activityType: string): string {
  const eventNames: { [key: string]: string } = {
    checkpoint_checkin: "Checkpoint Check-in",
    daily_checkin: "Daily Check-in",
    profile_field_email: "Added Email",
    profile_field_name: "Added Name",
    profile_field_username: "Added Username",
    profile_field_twitter: "Added X Handle",
    profile_field_towns: "Added Towns Handle",
    profile_field_farcaster: "Added Farcaster Handle",
    profile_field_telegram: "Added Telegram Handle",
    profile_field_picture: "Added Profile Picture",
    wallet_connect: "Connected Wallet",
    transaction_complete: "Transaction Complete",
    social_share: "Social Share",
    referral_signup: "Referral Signup",
    // Add more activity types as needed
  };

  return eventNames[activityType] || activityType.replace(/_/g, " ");
}
