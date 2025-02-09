import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Input validation schema
const requestSchema = z.object({
  userAddress: z.string().startsWith("0x"),
});

export async function GET(request: NextRequest) {
  try {
    const userAddress = request.nextUrl.searchParams.get("address");
    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = requestSchema.parse({ userAddress });

    // Check if user already has a number
    const { data: existingAssignment } = await supabase
      .from("assignments")
      .select("assigned_number")
      .eq("user_address", validatedData.userAddress)
      .single();

    if (existingAssignment) {
      return NextResponse.json({ number: existingAssignment.assigned_number });
    }

    // Get the last assigned number
    const { data: lastAssignment } = await supabase
      .from("assignments")
      .select("assigned_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate next number
    let nextNumber = 21; // Start with 21
    if (lastAssignment) {
      nextNumber =
        lastAssignment.assigned_number >= 66
          ? 21 // Reset to 21 if we reached 66
          : lastAssignment.assigned_number + 1;
    }

    // Assign the new number
    const { error: insertError } = await supabase.from("assignments").insert([
      {
        user_address: validatedData.userAddress,
        assigned_number: nextNumber,
      },
    ]);

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        // PostgreSQL unique violation code
        // If we hit a race condition, fetch the existing number
        const { data: raceConditionAssignment } = await supabase
          .from("assignments")
          .select("assigned_number")
          .eq("user_address", validatedData.userAddress)
          .single();

        if (raceConditionAssignment) {
          return NextResponse.json({
            number: raceConditionAssignment.assigned_number,
          });
        }
      }
      throw insertError;
    }

    return NextResponse.json({ number: nextNumber });
  } catch (error) {
    console.error("Error in number assignment:", error);
    return NextResponse.json(
      { error: "Failed to assign number" },
      { status: 500 }
    );
  }
}
