import { NextRequest } from "next/server";
import { invalidateEventCache, getEventCacheStatus } from "@/lib/event-utils";
import { apiSuccess, apiError } from "@/lib/api/response";

/**
 * POST endpoint to invalidate the CheckIn events cache
 *
 * This is useful for admin operations or when you know the blockchain state has changed
 * and you want to ensure fresh data on the next query.
 *
 * @returns Success status and cache information
 */
export async function POST(req: NextRequest) {
  console.log("Invalidating cache");
  console.log(req);
  try {
    // Get cache status before invalidation
    const beforeStatus = getEventCacheStatus();

    // Invalidate the cache
    invalidateEventCache();

    // Get cache status after invalidation
    const afterStatus = getEventCacheStatus();

    return apiSuccess({
      before: beforeStatus,
      after: afterStatus,
    }, "Cache invalidated successfully");
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return apiError("Failed to invalidate cache", 500);
  }
}
