import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { checkAdminPermission } from "@/lib/db/admin";
import { apiSuccess, apiError } from "@/lib/api/response";

// GET endpoint to fetch pending points
export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email");

    if (!checkAdminPermission(adminEmail || undefined)) {
      return apiError("Unauthorized - Admin access required", 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const showAwarded = searchParams.get("showAwarded") === "true";

    // Fetch pending points
    let query = supabase.from("pending_points").select("*");

    if (!showAwarded) {
      query = query.eq("awarded", false);
    }

    const { data: pendingPoints, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get summary
    const { data: summary } = await supabase
      .from("pending_points_summary")
      .select("*");

    return apiSuccess({
      pendingPoints: pendingPoints || [],
      summary: summary || [],
    });
  } catch (error) {
    console.error("Error fetching pending points:", error);
    return apiError("Failed to fetch pending points", 500);
  }
}

// DELETE endpoint to remove pending points
export async function DELETE(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email");

    if (!checkAdminPermission(adminEmail || undefined)) {
      return apiError("Unauthorized - Admin access required", 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiError("Pending points ID required", 400);
    }

    const { error } = await supabase
      .from("pending_points")
      .delete()
      .eq("id", id)
      .eq("awarded", false); // Can only delete unaward points

    if (error) {
      throw error;
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error deleting pending points:", error);
    return apiError("Failed to delete pending points", 500);
  }
}
