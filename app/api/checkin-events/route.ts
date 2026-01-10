import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { testPublicClient } from "@/lib/publicClient";
import { checkinAddress } from "@/lib/checkin";
import {
  fetchCheckInEventsWithCache,
  getEventCacheStatus,
} from "@/lib/event-utils";
import { apiError } from "@/lib/api/response";

export interface CheckInEvent {
  user: `0x${string}`;
  checkpointId: bigint;
  points: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  timestamp?: number; // Optional timestamp if available
}

/**
 * Converts BigInt values in an object to strings to make them JSON serializable
 * @param obj The object containing potential BigInt values
 * @returns A new object with BigInt values converted to strings
 */
function serializeBigInt<T>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

/**
 * Converts an array of CheckInEvent objects to CSV format
 * @param events Array of CheckInEvent objects
 * @returns CSV formatted string
 */
function convertToCSV(events: CheckInEvent[]): string {
  // Define CSV headers
  const headers = [
    "user",
    "checkpointId",
    "points",
    "blockNumber",
    "transactionHash",
    "timestamp",
  ];

  // Create CSV header row
  let csv = headers.join(",") + "\n";

  // Add data rows
  events.forEach((event) => {
    const row = [
      event.user,
      event.checkpointId.toString(),
      event.points.toString(),
      event.blockNumber.toString(),
      event.transactionHash,
      event.timestamp ? event.timestamp.toString() : "",
    ];

    // Escape any fields containing commas with quotes
    const escapedRow = row.map((field) => {
      if (field.includes(",")) {
        return `"${field}"`;
      }
      return field;
    });

    csv += escapedRow.join(",") + "\n";
  });

  return csv;
}

/**
 * GET endpoint to retrieve all successful CheckIn events from the contract
 *
 * Query parameters:
 * - limit: number of events to return (default: 100)
 * - offset: number of events to skip (default: 0)
 * - user: filter events by user address
 * - checkpoint: filter events by checkpoint ID
 * - fromBlock: starting block number (default: 'earliest')
 * - toBlock: ending block number (default: 'latest')
 * - refresh: force refresh the cache (default: false)
 * - export: format to export data (csv for CSV export)
 *
 * @returns Array of CheckIn events with user address and checkpoint ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Parse query parameters
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const userFilter = url.searchParams.get("user") as `0x${string}` | null;
    const checkpointFilter = url.searchParams.get("checkpoint")
      ? BigInt(url.searchParams.get("checkpoint") as string)
      : null;
    const fromBlock = url.searchParams.get("fromBlock") || "earliest";
    const toBlock = url.searchParams.get("toBlock") || "latest";
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const exportFormat = url.searchParams.get("export");

    // Get the cache status before fetching
    const cacheStatusBefore = getEventCacheStatus();

    // Fetch events with caching
    const allEvents = await fetchCheckInEventsWithCache(
      testPublicClient,
      checkinAddress,
      {
        forceRefresh,
        fromBlock: fromBlock as "earliest" | bigint,
        toBlock: toBlock as "latest" | bigint,
        userAddress: userFilter || undefined,
      }
    );

    // Get the cache status after fetching
    const cacheStatusAfter = getEventCacheStatus();

    // Apply checkpoint filter if provided
    let filteredEvents = allEvents;
    if (checkpointFilter !== null) {
      filteredEvents = allEvents.filter(
        (event) => event.checkpointId === checkpointFilter
      );
    }

    // Get total count before pagination
    const totalCount = filteredEvents.length;

    // Apply pagination
    const paginatedEvents = filteredEvents
      .sort((a, b) => Number(b.blockNumber - a.blockNumber)) // Sort by block number (newest first)
      .slice(offset, offset + limit);

    // Try to fetch block timestamps for each event (if needed)
    // This is optional and can be removed if performance is a concern
    const eventsWithTimestamps = await Promise.all(
      paginatedEvents.map(async (event) => {
        if (event.timestamp) return event; // Skip if timestamp already exists

        try {
          const block = await testPublicClient.getBlock({
            blockNumber: event.blockNumber,
          });
          return {
            ...event,
            timestamp: Number(block.timestamp),
          };
        } catch {
          // If we can't get the timestamp, just return the event as is
          return event;
        }
      })
    );

    // Handle CSV export if requested
    if (exportFormat === "csv") {
      const csvData = convertToCSV(eventsWithTimestamps);

      // Generate a filename with current date
      const date = new Date().toISOString().split("T")[0];
      const filename = `checkin-events-${date}.csv`;

      // Create response with CSV data and appropriate headers
      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          // Prevent caching to ensure fresh data
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Default JSON response
    // Serialize BigInt values to strings before returning JSON
    const responseData = {
      success: true,
      events: eventsWithTimestamps,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      cache: {
        wasCached: cacheStatusBefore.isCached && !forceRefresh,
        refreshed: !cacheStatusBefore.isCached || forceRefresh,
        lastUpdated: cacheStatusAfter.lastUpdated,
        expiresAt: cacheStatusAfter.expiresAt,
      },
    };

    // Return the serialized data as JSON
    return NextResponse.json(serializeBigInt(responseData));
  } catch (error) {
    console.error("Error fetching CheckIn events:", error);
    return apiError("Failed to fetch CheckIn events", 500);
  }
}
