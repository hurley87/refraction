import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/perks/redeem { perkId, walletAddress }
export async function POST(request: NextRequest) {
  try {
    const { perkId, walletAddress } = await request.json();
    if (!perkId || !walletAddress) {
      return NextResponse.json(
        { error: "perkId and walletAddress are required" },
        { status: 400 },
      );
    }

    // Check user points and perk threshold
    const { data: user, error: userError } = await supabase
      .from("players")
      .select("total_points")
      .eq("wallet_address", walletAddress)
      .single();
    if (userError) throw userError;

    const { data: perk, error: perkError } = await supabase
      .from("perks")
      .select("*")
      .eq("id", perkId)
      .single();
    if (perkError) throw perkError;

    if (!user || user.total_points < perk.points_threshold) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 },
      );
    }

    // Prevent duplicate redemption
    const { data: existing } = await supabase
      .from("user_perk_redemptions")
      .select("id")
      .eq("perk_id", perkId)
      .eq("user_wallet_address", walletAddress)
      .single();
    if (existing) {
      return NextResponse.json(
        { error: "Perk already redeemed" },
        { status: 400 },
      );
    }

    // Get available code
    const { data: availableCode, error: codeError } = await supabase
      .from("perk_discount_codes")
      .select("*")
      .eq("perk_id", perkId)
      .eq("is_claimed", false)
      .limit(1)
      .single();
    if (codeError || !availableCode) {
      return NextResponse.json(
        { error: "No discount codes available" },
        { status: 400 },
      );
    }

    // Create redemption and return code
    const { data, error } = await supabase
      .from("user_perk_redemptions")
      .insert({
        perk_id: perkId,
        discount_code_id: availableCode.id,
        user_wallet_address: walletAddress,
      })
      .select(`*, perk_discount_codes ( code )`)
      .single();
    if (error) throw error;

    return NextResponse.json({ redemption: data });
  } catch (error) {
    console.error("POST /api/perks/redeem error:", error);
    return NextResponse.json(
      { error: "Failed to redeem perk" },
      { status: 500 },
    );
  }
}
