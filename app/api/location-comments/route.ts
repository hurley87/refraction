import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const limitParam = searchParams.get("limit");

    if (!placeId) {
      return apiError("placeId query parameter is required", 400);
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
        return apiSuccess({ checkins: [] });
      }
      throw error;
    }

    const locationId = data?.id;
    if (!locationId) {
      return apiSuccess({ checkins: [] });
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

    const checkins = (checkinData || []).map((entry) => {
      // Supabase returns joined tables as arrays, extract first element
      const player = Array.isArray(entry.players) ? entry.players[0] : entry.players;
      return {
        id: entry.id,
        comment: entry.comment,
        imageUrl: entry.image_url,
        pointsEarned: entry.points_earned,
        createdAt: entry.created_at || entry.checkin_at,
        username: player?.username || null,
        walletAddress: player?.wallet_address || null,
      };
    });

    return apiSuccess({ checkins });
  } catch (error) {
    console.error("Location comments API error:", error);
    return apiError("Failed to fetch location comments", 500);
  }
}
