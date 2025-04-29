import { NextResponse } from "next/server";
import { getCheckinByAddress } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    const checkins = await getCheckinByAddress(address);
    const hasCheckedIn = checkins && checkins.length > 0;

    return NextResponse.json({ hasCheckedIn });
  } catch (error) {
    console.error("Error checking check-in status:", error);
    return NextResponse.json(
      { error: "Failed to check check-in status" },
      { status: 500 }
    );
  }
}
