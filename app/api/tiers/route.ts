import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET() {
  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("min_points", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data ?? [] });
}
