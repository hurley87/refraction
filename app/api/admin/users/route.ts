import { NextRequest, NextResponse } from "next/server";
import { supabase, checkAdminPermission } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Get email from header (set by middleware or client)
    const email = request.headers.get("x-user-email");

    // Check admin permission
    if (!checkAdminPermission(email || undefined)) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 },
      );
    }

    // Fetch total count
    const { count: totalCount, error: countError } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error fetching user count:", countError);
      return NextResponse.json(
        { error: "Failed to fetch user count" },
        { status: 500 },
      );
    }

    // Fetch paginated users from players table with their points
    const { data: users, error: usersError } = await supabase
      .from("players")
      .select("id, wallet_address, email, username, total_points, created_at")
      .order("total_points", { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      });
    }

    // Format user data
    const usersWithStats = users.map((user) => ({
      id: user.id,
      wallet_address: user.wallet_address,
      email: user.email || "",
      username: user.username || "",
      total_points: user.total_points || 0,
      created_at: user.created_at,
    }));

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in users admin route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST endpoint to check admin status
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const isAdmin = checkAdminPermission(email);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
