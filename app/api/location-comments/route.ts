import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const limitParam = searchParams.get("limit");

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId query parameter is required" },
        { status: 400 },
      );
    }

    const limit = Math.max(
      1,
      Math.min(parseInt(limitParam || "6", 10) || 6, 20),
    );

    const { data, error } = await supabase
      .from("locations")
      .select("id, place_id")
      .eq("place_id", placeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ checkins: [] });
      }
      throw error;
    }

    const locationId = data?.id;
    if (!locationId) {
      return NextResponse.json({ checkins: [] });
    }

    const { data: checkinData, error: checkinError } = await supabase
      .from("player_location_checkins")
      .select(
        `
          id,
          comment,
          image_url,
          points_earned,
          created_at,
          checkin_at,
          players:player_id (
            username,
            wallet_address
          ),
          locations:location_id (
            place_id
          )
        `,
      )
      .eq("location_id", locationId)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (checkinError) {
      throw checkinError;
    }

    const checkins = (checkinData || []).map((entry: any) => ({
      id: entry.id,
      comment: entry.comment,
      imageUrl: entry.image_url,
      pointsEarned: entry.points_earned,
      createdAt: entry.created_at || entry.checkin_at,
      username: entry.players?.username || null,
      walletAddress: entry.players?.wallet_address || null,
    }));

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error("Location comments API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location comments" },
      { status: 500 },
    );
  }
}
