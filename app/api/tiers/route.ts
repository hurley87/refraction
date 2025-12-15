import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("tiers")
      .select("*")
      .order("min_points", { ascending: true });

    if (error) {
      throw error;
    }

    return apiSuccess({ tiers: data ?? [] });
  } catch (error) {
    console.error("GET /api/tiers error:", error);
    return apiError("Failed to fetch tiers", 500);
  }
}
