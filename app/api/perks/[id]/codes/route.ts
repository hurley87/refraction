import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

// GET /api/perks/[id]/codes
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data, error } = await supabase
      .from("perk_discount_codes")
      .select("*")
      .eq("perk_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return apiSuccess({ codes: data ?? [] });
  } catch (error) {
    console.error("GET /api/perks/[id]/codes error:", error);
    return apiError("Failed to fetch codes", 500);
  }
}

interface CodeRow {
  perk_id: string;
  code: string;
}

// POST /api/perks/[id]/codes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { codes } = await request.json();
    if (!Array.isArray(codes) || codes.length === 0) {
      return apiError("codes must be a non-empty array", 400);
    }

    const rows = codes
      .map((code: string) => ({ perk_id: params.id, code: code.trim() }))
      .filter((r: CodeRow) => r.code);

    const { data, error } = await supabase
      .from("perk_discount_codes")
      .insert(rows)
      .select();

    if (error) throw error;
    return apiSuccess({ codes: data });
  } catch (error) {
    console.error("POST /api/perks/[id]/codes error:", error);
    return apiError("Failed to add codes", 500);
  }
}
