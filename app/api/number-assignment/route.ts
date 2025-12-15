import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { supabase } from "@/lib/db/client";
import { z } from "zod";

// Input validation schema
const requestSchema = z.object({
  userAddress: z.string().startsWith("0x"),
});

// Define the sequence of numbers
const NUMBER_SEQUENCE = [
  11, 13, 15, 21, 22, 23, 24, 25, 26, 31, 32, 33, 34, 35, 36, 41, 42, 43, 44,
  45, 46, 51, 52, 53, 54, 55, 56, 61, 62, 63, 64, 65, 66,
];

const SLOTS_PER_NUMBER = 10;

// Type for the assignment record
type Assignment = {
  assigned_number: number;
  user_address: string;
};

export async function GET(request: NextRequest) {
  try {
    const userAddress = request.nextUrl.searchParams.get("address");
    console.log("userAddress", userAddress);
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
      return NextResponse.json({
        number: parseInt(existingAssignment.assigned_number),
      });
    }

    // Get all assigned numbers with their counts
    const { data: numberCounts } = await supabase
      .from("assignments")
      .select("assigned_number")
      .order("created_at", { ascending: true });

    console.log("numberCounts", numberCounts);

    // Count occurrences of each number
    const countMap = new Map<number, number>();
    numberCounts?.forEach((assignment) => {
      const assignedNumber = parseInt(assignment.assigned_number);
      const count = countMap.get(assignedNumber) || 0;
      countMap.set(assignedNumber, count + 1);
    });

    // First, try to find an unassigned number in the sequence
    let nextNumber = NUMBER_SEQUENCE.find((num) => !countMap.has(num));

    console.log("nextNumber", nextNumber);

    // If all numbers have been assigned at least once, find one that hasn't reached its slot limit
    if (!nextNumber) {
      nextNumber = NUMBER_SEQUENCE.find((num) => {
        const count = countMap.get(num) || 0;
        return count < SLOTS_PER_NUMBER;
      });
    }

    if (!nextNumber) {
      return NextResponse.json(
        { error: "All number slots are filled" },
        { status: 409 }
      );
    }

    // Assign the new number
    const newAssignment: Assignment = {
      user_address: validatedData.userAddress,
      assigned_number: nextNumber,
    };

    const { error: insertError } = await supabase
      .from("assignments")
      .insert([newAssignment]);

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        // If we hit a race condition, fetch the existing number
        const { data: raceConditionAssignment } = await supabase
          .from("assignments")
          .select("assigned_number")
          .eq("user_address", validatedData.userAddress)
          .single();

        if (raceConditionAssignment) {
          return NextResponse.json({
            number: parseInt(raceConditionAssignment.assigned_number),
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
