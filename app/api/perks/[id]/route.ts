import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

// GET /api/perks/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data, error } = await supabase
      .from("perks")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw error;
    return apiSuccess({ perk: data });
  } catch (error) {
    console.error("GET /api/perks/[id] error:", error);
    return apiError("Failed to fetch perk", 500);
  }
}

// PATCH /api/perks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const updates = await request.json();
    const { data, error } = await supabase
      .from("perks")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;
    return apiSuccess({ perk: data });
  } catch (error) {
    console.error("PATCH /api/perks/[id] error:", error);
    return apiError("Failed to update perk", 500);
  }
}

// DELETE /api/perks/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error } = await supabase.from("perks").delete().eq("id", params.id);
    if (error) throw error;
    return apiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/perks/[id] error:", error);
    return apiError("Failed to delete perk", 500);
  }
}
