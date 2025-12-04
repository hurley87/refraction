"use client";

import { useEffect, useState, useMemo } from "react";
import {
  // MapPin, CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LocationListWithCount, Location } from "@/lib/supabase";

export type DrawerLocationSummary = Pick<
  Location,
  | "id"
  | "name"
  | "display_name"
  | "description"
  | "place_id"
  | "latitude"
  | "longitude"
  | "context"
  | "type"
  | "points_value"
  | "coin_image_url"
>;

type DrawerList = LocationListWithCount & {
  locations?: Array<
    {
      membershipId: number;
    } & DrawerLocationSummary
  >;
};

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface LocationListsDrawerProps {
  walletAddress?: string | null;
  onLocationFocus?: (location: DrawerLocationSummary) => void;
  mapBounds?: MapBounds | null; // Current map viewport bounds (what's visible on screen)
  userLocation?: UserLocation | null; // Not used for filtering, kept for potential future use
}

/**
 * Check if a location is within map bounds.
 * Handles longitude wrapping across the anti-meridian.
 */
const isLocationInBounds = (
  location: DrawerLocationSummary,
  bounds: MapBounds,
): boolean => {
  if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    console.log(
      "[Filter] Location missing coordinates:",
      location.name || location.display_name,
    );
    return false;
  }

  const { latitude, longitude } = location;
  const { north, south, east, west } = bounds;

  // Check latitude bounds
  const latInBounds = latitude >= south && latitude <= north;
  if (!latInBounds) {
    console.log(
      `[Filter] Location "${location.name || location.display_name}" FAILED latitude check:`,
      { locationLat: latitude, boundsSouth: south, boundsNorth: north },
    );
    return false;
  }

  // Handle longitude wrapping (e.g., crossing 180/-180)
  // If bounds cross the anti-meridian (west > east), we need special handling
  let lonInBounds: boolean;
  if (west > east) {
    // Bounds cross the anti-meridian
    lonInBounds = longitude >= west || longitude <= east;
  } else {
    // Normal case: bounds don't cross the anti-meridian
    lonInBounds = longitude >= west && longitude <= east;
  }

  if (!lonInBounds) {
    console.log(
      `[Filter] Location "${location.name || location.display_name}" FAILED longitude check:`,
      { locationLon: longitude, boundsWest: west, boundsEast: east },
    );
    return false;
  }

  console.log(
    `[Filter] Location "${location.name || location.display_name}" PASSED:`,
    { lat: latitude, lon: longitude, bounds },
  );
  return true;
};

/**
 * Get effective bounds for filtering based on map viewport.
 * Only uses mapBounds (what's visible in the viewport), not user location.
 * Falls back to default New York bounds if map bounds aren't available yet.
 */
const getEffectiveBounds = (
  mapBounds: MapBounds | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userLocation: UserLocation | null | undefined, // Not used for filtering, kept for API compatibility
): MapBounds | null => {
  // Priority 1: Use map bounds (what's visible in the viewport)
  if (mapBounds) {
    return mapBounds;
  }

  // Priority 2: Default to New York with generous radius (only used before map loads)
  // This ensures locations are visible on initial load
  const defaultLat = 40.7081;
  const defaultLng = -73.9442;
  const latAdjustment = Math.cos((defaultLat * Math.PI) / 180);
  // ~20km radius for initial view
  const radiusDegrees = 0.235 / latAdjustment;

  return {
    north: defaultLat + radiusDegrees,
    south: defaultLat - radiusDegrees,
    east: defaultLng + radiusDegrees,
    west: defaultLng - radiusDegrees,
  };
};

export default function LocationListsDrawer({
  walletAddress: _walletAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
  onLocationFocus,
  mapBounds,
  userLocation,
}: LocationListsDrawerProps) {
  const [lists, setLists] = useState<DrawerList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  // const [visitedLocationIds, setVisitedLocationIds] = useState<Set<number>>(
  //   new Set(),
  // );

  useEffect(() => {
    const controller = new AbortController();
    const loadLists = async () => {
      setIsLoadingLists(true);
      try {
        const response = await fetch(
          "/api/location-lists?includeLocations=true",
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Failed to load lists");
        const data = await response.json();
        const fetchedLists: DrawerList[] = data.lists || [];
        setLists(fetchedLists);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load location lists", error);
        }
      } finally {
        setIsLoadingLists(false);
      }
    };
    loadLists();
    return () => controller.abort();
  }, []);

  // Filter locations based on map bounds
  const filteredLists = useMemo(() => {
    console.log("[Filter] Starting filter with mapBounds:", mapBounds);
    const effectiveBounds = getEffectiveBounds(mapBounds, userLocation);
    console.log("[Filter] Effective bounds:", effectiveBounds);

    if (!effectiveBounds) {
      // If no bounds available, return all lists (shouldn't happen due to fallback)
      console.log("[Filter] No effective bounds, returning all lists");
      return lists;
    }

    console.log(
      `[Filter] Filtering ${lists.length} lists with bounds:`,
      effectiveBounds,
    );

    const filtered = lists
      .map((list) => {
        if (!list.locations || list.locations.length === 0) {
          return { ...list, locations: [] }; // Return list with empty locations array
        }

        const totalLocations = list.locations.length;
        console.log(
          `[Filter] Filtering list "${list.title}" with ${totalLocations} locations`,
        );

        const filteredLocations = list.locations.filter((location) =>
          isLocationInBounds(location, effectiveBounds),
        );

        console.log(
          `[Filter] List "${list.title}": ${filteredLocations.length}/${totalLocations} locations passed filter`,
        );

        return {
          ...list,
          locations: filteredLocations,
        };
      })
      .filter((list) => {
        // Remove lists with no locations after filtering
        return (list.locations?.length ?? 0) > 0;
      });

    const totalFiltered = filtered.reduce(
      (sum, list) => sum + (list.locations?.length || 0),
      0,
    );
    const totalOriginal = lists.reduce(
      (sum, list) => sum + (list.locations?.length || 0),
      0,
    );

    console.log(
      `[Filter] Filtering complete. ${totalFiltered}/${totalOriginal} locations passed filter`,
    );

    if (totalFiltered === 0 && totalOriginal > 0) {
      console.warn(
        `[Filter] ⚠️ All ${totalOriginal} locations were filtered out!`,
        `This means no locations in the lists match the current map viewport bounds.`,
        `Bounds:`,
        effectiveBounds,
      );
    }

    return filtered;
  }, [lists, mapBounds, userLocation]);

  // useEffect(() => {
  //   if (!walletAddress) {
  //     setVisitedLocationIds(new Set());
  //     return;
  //   }

  //   const controller = new AbortController();
  //   const loadVisitedLocations = async () => {
  //     try {
  //       const response = await fetch(
  //         `/api/locations?walletAddress=${encodeURIComponent(walletAddress)}`,
  //         { signal: controller.signal },
  //       );
  //       if (!response.ok) throw new Error("Failed to load visited locations");
  //       const data = await response.json();
  //       const ids = new Set<number>(
  //         (data.locations || [])
  //           .map((location: Location) => location.id)
  //           .filter(
  //             (id: number | undefined): id is number => typeof id === "number",
  //           ),
  //       );
  //       setVisitedLocationIds(ids);
  //     } catch (error) {
  //       if ((error as Error).name !== "AbortError") {
  //         console.error("Failed to load visited locations", error);
  //       }
  //     }
  //   };

  //   loadVisitedLocations();
  //   return () => controller.abort();
  // }, [walletAddress]);

  // const visitedCount = useMemo(() => {
  //   if (!activeList?.locations?.length) return 0;
  //   return activeList.locations.reduce((count, location) => {
  //     if (location.id && visitedLocationIds.has(location.id)) {
  //       return count + 1;
  //     }
  //     return count;
  //   }, 0);
  // }, [activeList, visitedLocationIds]);

  // Check if there are any visible locations after filtering
  const hasVisibleLocations = useMemo(() => {
    if (isLoadingLists) return true; // Show drawer while loading
    return filteredLists.some(
      (list) => list.locations && list.locations.length > 0,
    );
  }, [filteredLists, isLoadingLists]);

  if (!hasVisibleLocations) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-3 pb-3">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300">
        {/* Handle */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="group flex w-full items-center justify-center py-2"
          aria-label={
            isExpanded ? "Collapse lists drawer" : "Expand lists drawer"
          }
        >
          <span className="h-[3px] w-8 rounded-full bg-black/10 transition-colors group-hover:bg-black/20" />
        </button>

        <div className="px-4 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[15px] font-inktrap font-medium tracking-[-0.3px] text-[#1a1a1a]">
                Explore
              </p>
              <p className="text-xs font-anonymous text-[#888]">
                Discover spots near you
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-[10px] font-inktrap uppercase tracking-[1px] text-[#1a1a1a] transition-all hover:bg-black/[0.08] active:scale-95"
            >
              {isExpanded ? "Hide" : "View"}
              {isExpanded ? (
                <ChevronDown className="h-2.5 w-2.5" />
              ) : (
                <ChevronUp className="h-2.5 w-2.5" />
              )}
            </button>
          </div>

          {/* Expandable content */}
          <div
            className={`grid transition-all duration-300 ease-out ${
              isExpanded
                ? "mt-3 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="max-h-64 overflow-y-auto space-y-4">
                {isLoadingLists ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={`list-skeleton-${index}`} className="space-y-2">
                        <div className="h-4 w-24 rounded bg-black/[0.04] animate-pulse" />
                        <div className="flex gap-2 overflow-x-hidden">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div
                              key={`card-skeleton-${index}-${i}`}
                              className="h-32 w-36 flex-shrink-0 rounded-xl bg-black/[0.04] animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  filteredLists.map((list) => {
                    const visibleCount = list.locations?.length ?? 0;
                    return (
                      <div key={list.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-inktrap font-medium text-[#1a1a1a]">
                            {list.title}
                          </p>
                          <span className="text-[10px] font-anonymous text-[#999]">
                            {visibleCount > 0
                              ? `${visibleCount} spots`
                              : "No spots"}
                          </span>
                        </div>
                        {list.locations && list.locations.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                            {list.locations.map((location) => (
                              <article
                                key={location.membershipId}
                                onClick={() => onLocationFocus?.(location)}
                                className="group relative flex w-36 flex-shrink-0 flex-col rounded-xl bg-black/[0.02] p-1.5 transition-all hover:bg-black/[0.04] active:scale-[0.98] cursor-pointer"
                              >
                                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                                  {location.coin_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={location.coin_image_url}
                                      alt={location.name}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-black/[0.04] text-[10px] font-anonymous text-[#999]">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1.5 px-0.5">
                                  <p className="text-xs font-inktrap text-[#1a1a1a] truncate leading-tight">
                                    {location.display_name}
                                  </p>
                                  <p className="text-[9px] font-anonymous text-[#888] truncate mt-0.5">
                                    {location.description || location.name}
                                  </p>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] font-anonymous text-[#999]">
                            No locations in view.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
