import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/perks/codes/[codeId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete code" },
      { status: 500 },
    );
  }
}
