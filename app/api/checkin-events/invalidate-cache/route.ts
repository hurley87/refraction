import { NextRequest, NextResponse } from "next/server";
import { invalidateEventCache, getEventCacheStatus } from "@/lib/event-utils";

/**
 * POST endpoint to invalidate the CheckIn events cache
 *
 * This is useful for admin operations or when you know the blockchain state has changed
 * and you want to ensure fresh data on the next query.
 *
 * @returns Success status and cache information
 */
export async function POST(req: NextRequest) {
  try {
    // Get cache status before invalidation
    const beforeStatus = getEventCacheStatus();

    // Invalidate the cache
    invalidateEventCache();

    // Get cache status after invalidation
    const afterStatus = getEventCacheStatus();

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
      before: beforeStatus,
      after: afterStatus,
    });
  } catch (error) {
    console.error("Error invalidating cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to invalidate cache",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
