import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { checkAdminPermission } from "@/lib/db/admin";
import { v4 as uuidv4 } from "uuid";

interface CSVRow {
  email: string;
  reason: string;
  points: number;
}

interface UploadResult {
  email: string;
  points: number;
  reason: string;
  status: "success" | "failed" | "user_not_found";
  error?: string;
  wallet_address?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get email from header
    const adminEmail = request.headers.get("x-user-email");

    // Check admin permission
    if (!checkAdminPermission(adminEmail || undefined)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read and parse CSV
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or invalid" },
        { status: 400 },
      );
    }

    // Generate batch ID for this upload
    const batchId = uuidv4();
    const results: UploadResult[] = [];

    // Process each row
    for (const row of rows) {
      try {
        // Validate row
        if (!row.email || !row.reason || !row.points) {
          results.push({
            email: row.email || "unknown",
            points: row.points || 0,
            reason: row.reason || "",
            status: "failed",
            error: "Missing required fields (email, reason, or points)",
          });
          continue;
        }

        // Check if points is a valid positive number
        const points = Number(row.points);
        if (isNaN(points) || points <= 0) {
          results.push({
            email: row.email,
            points: row.points,
            reason: row.reason,
            status: "failed",
            error: "Points must be a positive number",
          });
          continue;
        }

        // Find user by email
        const { data: user, error: userError } = await supabase
          .from("players")
          .select("id, wallet_address, email")
          .eq("email", row.email.trim().toLowerCase())
          .single();

        if (userError || !user) {
          // Store as pending points for future signup
          const { error: pendingError } = await supabase
            .from("pending_points")
            .insert({
              email: row.email.trim().toLowerCase(),
              points: points,
              reason: row.reason,
              uploaded_by_email: adminEmail,
              upload_batch_id: batchId,
              awarded: false,
            });

          if (pendingError) {
            console.error("Error saving pending points:", pendingError);
          }

          results.push({
            email: row.email,
            points: points,
            reason: row.reason,
            status: "user_not_found",
            error: "User not found - saved as pending points for future signup",
          });

          // Still record the attempt in upload history
          await supabase.from("points_uploads").insert({
            email: row.email.trim().toLowerCase(),
            points_awarded: points,
            reason: row.reason,
            user_wallet_address: null,
            upload_batch_id: batchId,
            uploaded_by_email: adminEmail,
            status: "user_not_found",
            error_message:
              "User not found - saved as pending points for future signup",
          });

          continue;
        }

        // Award points by inserting into points_activities
        const { error: pointsError } = await supabase
          .from("points_activities")
          .insert({
            user_wallet_address: user.wallet_address,
            activity_type: "admin_bulk_upload",
            points_earned: points,
            description: `Admin upload: ${row.reason}`,
            metadata: {
              upload_batch_id: batchId,
              uploaded_by: adminEmail,
              reason: row.reason,
            },
            processed: true,
          });

        if (pointsError) {
          results.push({
            email: row.email,
            points: points,
            reason: row.reason,
            status: "failed",
            error: pointsError.message,
            wallet_address: user.wallet_address,
          });

          // Record the failure
          await supabase.from("points_uploads").insert({
            email: row.email.trim().toLowerCase(),
            points_awarded: points,
            reason: row.reason,
            user_wallet_address: user.wallet_address,
            upload_batch_id: batchId,
            uploaded_by_email: adminEmail,
            status: "failed",
            error_message: pointsError.message,
          });

          continue;
        }

        // Record successful upload
        await supabase.from("points_uploads").insert({
          email: row.email.trim().toLowerCase(),
          points_awarded: points,
          reason: row.reason,
          user_wallet_address: user.wallet_address,
          upload_batch_id: batchId,
          uploaded_by_email: adminEmail,
          status: "success",
        });

        results.push({
          email: row.email,
          points: points,
          reason: row.reason,
          status: "success",
          wallet_address: user.wallet_address,
        });
      } catch (error) {
        console.error("Error processing row:", error);
        results.push({
          email: row.email || "unknown",
          points: row.points || 0,
          reason: row.reason || "",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      user_not_found: results.filter((r) => r.status === "user_not_found")
        .length,
      total_points_awarded: results
        .filter((r) => r.status === "success")
        .reduce((sum, r) => sum + r.points, 0),
    };

    return NextResponse.json({
      success: true,
      batchId,
      summary,
      results,
    });
  } catch (error) {
    console.error("Error in points upload route:", error);
    return NextResponse.json(
      {
        error: "Failed to process upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to fetch upload history
export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email");

    if (!checkAdminPermission(adminEmail || undefined)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch batch summaries
    const { data: batches, error: batchError } = await supabase
      .from("points_uploads_batch_summary")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchError) {
      throw batchError;
    }

    // Fetch recent individual uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from("points_uploads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (uploadsError) {
      throw uploadsError;
    }

    return NextResponse.json({
      batches: batches || [],
      uploads: uploads || [],
    });
  } catch (error) {
    console.error("Error fetching upload history:", error);
    return NextResponse.json(
      { error: "Failed to fetch upload history" },
      { status: 500 },
    );
  }
}

// Helper function to parse CSV
function parseCSV(text: string): CSVRow[] {
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Detect delimiter and parse header
  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const header = headerLine
    .split(delimiter)
    .map((h) => h.trim().toLowerCase());
  console.log("Parsed CSV header:", header, "using delimiter:", JSON.stringify(delimiter));
  const emailIndex = header.indexOf("email");
  const reasonIndex = header.indexOf("reason");
  const pointsIndex = header.indexOf("points");

  if (emailIndex === -1 || reasonIndex === -1 || pointsIndex === -1) {
    throw new Error('CSV must have columns: "email", "reason", and "points"');
  }

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);

    rows.push({
      email: values[emailIndex]?.trim() || "",
      reason: values[reasonIndex]?.trim() || "",
      points: parseFloat(values[pointsIndex]?.trim() || "0"),
    });
  }

  return rows;
}

// Helper: detect delimiter by choosing the most frequent candidate among ",", ";", and "\t"
function detectDelimiter(line: string): string {
  const candidates: string[] = [",", ";", "\t"];
  let best: string = candidates[0];
  let bestCount = -1;
  for (const cand of candidates) {
    const count = (line.match(new RegExp(escapeForRegex(cand), "g")) || [])
      .length;
    if (count > bestCount) {
      best = cand;
      bestCount = count;
    }
  }
  return best;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper to parse a CSV line with proper quote handling for the given delimiter
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
