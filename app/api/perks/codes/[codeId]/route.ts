import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

// DELETE /api/perks/codes/[codeId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { codeId: string } },
) {
  try {
    const { error } = await supabase
      .from("perk_discount_codes")
      .delete()
      .eq("id", params.codeId);

    if (error) throw error;
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/perks/codes/[codeId] error:", error);
    return apiError("Failed to delete code", 500);
  }
}
