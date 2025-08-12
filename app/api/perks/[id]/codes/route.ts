import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
    return NextResponse.json({ codes: data ?? [] });
  } catch (error) {
    console.error("GET /api/perks/[id]/codes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch codes" },
      { status: 500 },
    );
  }
}

// POST /api/perks/[id]/codes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { codes } = await request.json();
    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "codes must be a non-empty array" },
        { status: 400 },
      );
    }

    const rows = codes
      .map((code: string) => ({ perk_id: params.id, code: code.trim() }))
      .filter((r: any) => r.code);

    const { data, error } = await supabase
      .from("perk_discount_codes")
      .insert(rows)
      .select();

    if (error) throw error;
    return NextResponse.json({ codes: data });
  } catch (error) {
    console.error("POST /api/perks/[id]/codes error:", error);
    return NextResponse.json({ error: "Failed to add codes" }, { status: 500 });
  }
}
