import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

// GET /api/perks?activeOnly=true|false
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let query = supabase
      .from("perks")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ perks: data ?? [] });
  } catch (error) {
    console.error("GET /api/perks error:", error);
    return apiError("Failed to fetch perks", 500);
  }
}

// POST /api/perks
export async function POST(request: NextRequest) {
  try {
    const perk = await request.json();
    const { data, error } = await supabase
      .from("perks")
      .insert(perk)
      .select()
      .single();

    if (error) throw error;
    return apiSuccess({ perk: data });
  } catch (error) {
    console.error("POST /api/perks error:", error);
    return apiError("Failed to create perk", 500);
  }
}
