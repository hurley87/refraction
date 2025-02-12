import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Input validation schema
const requestSchema = z.object({
  userAddress: z.string().startsWith("0x"),
});

// Define the sequence of numbers
const VALID_NUMBERS = [
  11,
  13,
  15, // First slot (3 numbers)
  21,
  22,
  23,
  24,
  25,
  26, // Second slot (6 numbers)
  31,
  32,
  33,
  34,
  35,
  36, // Third slot
  41,
  42,
  43,
  44,
  45,
  46, // Fourth slot
  51,
  52,
  53,
  54,
  55,
  56, // Fifth slot
  61,
  62,
  63,
  64,
  65,
  66, // Sixth slot
];

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

    // Get all assigned numbers
    const { data: allAssignments } = await supabase
      .from("assignments")
      .select("assigned_number")
      .order("created_at", { ascending: true });

    // Find the first available number in the sequence
    const assignedNumbers = new Set(
      allAssignments?.map((a) => a.assigned_number) || []
    );
    const nextNumber =
      VALID_NUMBERS.find((num) => !assignedNumbers.has(num)) ||
      VALID_NUMBERS[0];

    if (!nextNumber) {
      return NextResponse.json(
        { error: "No available numbers" },
        { status: 409 }
      );
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
