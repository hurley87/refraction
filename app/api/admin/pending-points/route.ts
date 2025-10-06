import { NextRequest, NextResponse } from "next/server";
import { supabase, checkAdminPermission } from "@/lib/supabase";

// GET endpoint to fetch pending points
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

    return NextResponse.json({
      pendingPoints: pendingPoints || [],
      summary: summary || [],
    });
  } catch (error) {
    console.error("Error fetching pending points:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending points" },
      { status: 500 },
    );
  }
}

// DELETE endpoint to remove pending points
export async function DELETE(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email");

    if (!checkAdminPermission(adminEmail || undefined)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Pending points ID required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("pending_points")
      .delete()
      .eq("id", id)
      .eq("awarded", false); // Can only delete unaward points

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pending points:", error);
    return NextResponse.json(
      { error: "Failed to delete pending points" },
      { status: 500 },
    );
  }
}
