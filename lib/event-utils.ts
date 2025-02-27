import { PublicClient } from "viem";
import { CheckInEvent } from "@/app/api/checkin-events/route";

// Cache for storing event data to reduce blockchain queries
interface EventCache {
  events: CheckInEvent[];
  lastUpdated: number;
  expiresAt: number;
}

// In-memory cache (will be reset on server restart)
let eventCache: EventCache | null = null;

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Fetches CheckIn events with caching to improve performance
 *
 * @param client The Viem public client to use for fetching
 * @param contractAddress The address of the contract to query
 * @param options Optional parameters for filtering and pagination
 * @returns An array of CheckIn events
 */
export async function fetchCheckInEventsWithCache(
  client: PublicClient,
  contractAddress: `0x${string}`,
  options?: {
    forceRefresh?: boolean;
    fromBlock?: bigint | "earliest";
    toBlock?: bigint | "latest";
    userAddress?: `0x${string}`;
  }
): Promise<CheckInEvent[]> {
  const now = Date.now();
  const forceRefresh = options?.forceRefresh || false;

  // Return cached data if available and not expired
  if (!forceRefresh && eventCache && eventCache.expiresAt > now) {
    return eventCache.events;
  }

  // Fetch fresh data from the blockchain
  const logs = await client.getLogs({
    address: contractAddress,
    event: {
      type: "event",
      name: "CheckIn",
      inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: false, name: "checkpointId", type: "uint256" },
        { indexed: false, name: "points", type: "uint256" },
      ],
    },
    fromBlock: options?.fromBlock || "earliest",
    toBlock: options?.toBlock || "latest",
    ...(options?.userAddress ? { args: { user: options.userAddress } } : {}),
  });

  // Parse the logs
  const events = logs.map((log) => {
    const { args, blockNumber, transactionHash } = log;

    return {
      user: args.user,
      checkpointId: args.checkpointId,
      points: args.points,
      blockNumber,
      transactionHash,
    } as CheckInEvent;
  });

  // Update the cache
  eventCache = {
    events,
    lastUpdated: now,
    expiresAt: now + CACHE_EXPIRATION,
  };

  return events;
}

/**
 * Invalidates the event cache, forcing the next query to fetch fresh data
 */
export function invalidateEventCache(): void {
  eventCache = null;
}

/**
 * Gets the current cache status
 *
 * @returns Information about the current cache state
 */
export function getEventCacheStatus(): {
  isCached: boolean;
  lastUpdated: number | null;
  expiresAt: number | null;
  eventCount: number;
} {
  if (!eventCache) {
    return {
      isCached: false,
      lastUpdated: null,
      expiresAt: null,
      eventCount: 0,
    };
  }

  return {
    isCached: true,
    lastUpdated: eventCache.lastUpdated,
    expiresAt: eventCache.expiresAt,
    eventCount: eventCache.events.length,
  };
}
