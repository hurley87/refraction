import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

// Ensure the handler runs dynamically at request time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for heavy API processing with many players

// Constants for optimization
const BATCH_SIZE = 10; // Process players in batches
const REQUEST_TIMEOUT = 8000; // 8 seconds timeout per request
const MAX_EXECUTION_TIME = 280000; // 4 minutes 40 seconds (20 second buffer)

/**
 * Update Airtable records with the latest player points.
 *
 * This endpoint fetches all players from Supabase and updates the
 * corresponding Airtable record (matched by the `Email account` field)
 * with the player's `total_points` value.
 */
export async function GET() {
  const startTime = Date.now();
  
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
      .select("email,total_points")
      .not("email", "is", null);

    if (error) {
      throw error;
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No players found to update",
        updateResults: [] 
      });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      TABLE_NAME,
    )}`;

    const updateResults = [] as Array<{ email: string; updated: boolean; error?: string }>;

    // Helper function to make requests with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Helper function to update a single player
    const updatePlayer = async (player: { email: string; total_points: number }) => {
      try {
        // Check if we're approaching timeout
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          return { email: player.email, updated: false, error: "Execution timeout reached" };
        }

        // Find Airtable record by email
        const filterFormula = `LOWER({Email account})='${player.email.toLowerCase()}'`;
        const searchRes = await fetchWithTimeout(
          `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`,
          {
            headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
          }
        );

        if (!searchRes.ok) {
          return { email: player.email, updated: false, error: `Search failed: ${searchRes.status}` };
        }

        const searchData = await searchRes.json();

        if (searchData.records && searchData.records.length > 0) {
          const recordId = searchData.records[0].id;
          const patchRes = await fetchWithTimeout(`${url}/${recordId}`, {
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

          return { 
            email: player.email, 
            updated: patchRes.ok,
            error: patchRes.ok ? undefined : `Update failed: ${patchRes.status}`
          };
        } else {
          return { email: player.email, updated: false, error: "Record not found in Airtable" };
        }
      } catch (error) {
        return { 
          email: player.email, 
          updated: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        };
      }
    };

    // Process players in parallel batches
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        updateResults.push({
          email: "TIMEOUT",
          updated: false,
          error: `Processing stopped due to timeout. Processed ${i}/${players.length} players.`
        });
        break;
      }

      const batch = players.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(updatePlayer);
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          updateResults.push(result.value);
        } else {
          updateResults.push({
            email: "UNKNOWN",
            updated: false,
            error: result.reason?.message || "Batch processing failed"
          });
        }
      });

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < players.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = updateResults.filter(r => r.updated).length;
    const errorCount = updateResults.filter(r => !r.updated).length;

    return NextResponse.json({ 
      success: true, 
      updateResults,
      summary: {
        total: players.length,
        processed: updateResults.length,
        successful: successCount,
        failed: errorCount,
        executionTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error("Airtable update error:", error);
    return NextResponse.json({ 
      error: "Failed to update Airtable",
      details: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime
    }, { status: 500 });
  }
}
