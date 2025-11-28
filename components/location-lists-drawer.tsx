"use client";

import { useEffect, useState } from "react";
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

interface LocationListsDrawerProps {
  walletAddress?: string | null;
  onLocationFocus?: (location: DrawerLocationSummary) => void;
}

export default function LocationListsDrawer({
  walletAddress: _walletAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
  onLocationFocus,
}: LocationListsDrawerProps) {
  const [lists, setLists] = useState<DrawerList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
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

  if (!lists.length && !isLoadingLists) {
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
                  lists.map((list) => (
                    <div key={list.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-inktrap font-medium text-[#1a1a1a]">
                          {list.title}
                        </p>
                        <span className="text-[10px] font-anonymous text-[#999]">
                          {list.location_count} spots
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
                          No locations yet.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
