import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Input validation schema
const requestSchema = z.object({
  userAddress: z.string().startsWith("0x"),
});

// Define the sequence of numbers and their slot limits
const NUMBER_SEQUENCE = [
  11, 13, 15, 21, 22, 23, 24, 25, 26, 31, 32, 33, 34, 35, 36, 41, 42, 43, 44,
  45, 46, 51, 52, 53, 54, 55, 56, 61, 62, 63, 64, 65, 66,
];
const SLOTS_PER_NUMBER = 10;

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

    // Get all assigned numbers with counts
    const { data: numberCounts } = await supabase
      .from("assignments")
      .select("assigned_number")
      .order("created_at", { ascending: true });

    // Count occurrences of each number
    const countMap = new Map<number, number>();
    numberCounts?.forEach((assignment) => {
      const count = countMap.get(assignment.assigned_number) || 0;
      countMap.set(assignment.assigned_number, count + 1);
    });

    // Find the first number that hasn't reached its slot limit
    const nextNumber = NUMBER_SEQUENCE.find((num) => {
      const currentCount = countMap.get(num) || 0;
      return currentCount < SLOTS_PER_NUMBER;
    });

    if (!nextNumber) {
      return NextResponse.json(
        { error: "All number slots are filled" },
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
