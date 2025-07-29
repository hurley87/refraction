import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Ensure the handler runs dynamically at request time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Update Airtable records with the latest player points.
 *
 * This endpoint fetches all players from Supabase and updates the
 * corresponding Airtable record (matched by the `Email account` field)
 * with the player's `total_points` value.
 */
export async function GET() {
  try {
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? "IRL";

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable credentials are not configured." },
        { status: 500 },
      );
    }

    // Fetch all players with an email address
    const { data: players, error } = await supabase
      .from("players")
      .select("email,total_points");

    if (error) {
      throw error;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      TABLE_NAME,
    )}`;

    const updateResults = [] as Array<{ email: string; updated: boolean }>;

    for (const player of players ?? []) {
      if (!player.email) continue;

      // Find Airtable record by email
      const filterFormula = `LOWER({Email account})='${player.email.toLowerCase()}'`;
      const searchRes = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`,
        {
          headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
        },
      );
      const searchData = await searchRes.json();

      if (searchRes.ok && searchData.records && searchData.records.length > 0) {
        const recordId = searchData.records[0].id;
        const patchRes = await fetch(`${url}/${recordId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${AIRTABLE_PAT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              Points: player.total_points,
            },
          }),
        });
        updateResults.push({ email: player.email, updated: patchRes.ok });
      }
    }

    return NextResponse.json({ success: true, updateResults });
  } catch (error) {
    console.error("Airtable update error:", error);
    return NextResponse.json({ error: "Failed to update Airtable" }, { status: 500 });
  }
}
