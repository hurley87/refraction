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
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-0 pb-0">
      <div className="pointer-events-auto w-full max-w-md rounded-t-[30px] border border-white/30 bg-white/95 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:rounded-t-[36px] sm:p-6">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mx-auto mb-3 flex h-1 w-14 items-center justify-center rounded-full bg-[#d8d8d8] sm:mb-4 sm:h-1.5 sm:w-16"
          aria-label={
            isExpanded ? "Collapse lists drawer" : "Expand lists drawer"
          }
        />

        <div className="flex items-start gap-3  sm:items-center sm:justify-between">
          <div className="w-full">
            <p className="text-lg font-inktrap tracking-[-0.5px] text-[#131313]">
              Explore
            </p>
            <p className="text-sm font-anonymous text-[#7d7d7d]">
              Discover spots near you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex min-w-[136px] items-center justify-center gap-2 rounded-full border border-[#cfcfcf] px-4 py-2 text-[11px] font-inktrap uppercase tracking-[1.4px] text-[#131313] transition hover:bg-[#131313] hover:text-white"
          >
            {isExpanded ? "Hide" : "View"}
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 max-h-80 overflow-y-auto space-y-6">
            {isLoadingLists ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={`list-skeleton-${index}`} className="space-y-2">
                    <div className="h-5 w-32 rounded bg-[#f4f4f4] animate-pulse" />
                    <div className="flex gap-3 overflow-x-hidden">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div
                          key={`card-skeleton-${index}-${i}`}
                          className="h-44 w-52 flex-shrink-0 rounded-[28px] bg-[#f5f5f5] animate-pulse"
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
                    <p className="text-sm font-inktrap font-medium text-[#131313]">
                      {list.title}
                    </p>
                    <span className="text-xs font-anonymous text-[#7d7d7d]">
                      {list.location_count} spots
                    </span>
                  </div>
                  {list.locations && list.locations.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {list.locations.map((location) => (
                        <article
                          key={location.membershipId}
                          onClick={() => onLocationFocus?.(location)}
                          className="relative flex w-52 flex-shrink-0 flex-col rounded-[24px] border border-[#ededed] p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                        >
                          <div className="relative h-28 w-full overflow-hidden rounded-[18px]">
                            {location.coin_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={location.coin_image_url}
                                alt={location.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f5f5f5] text-xs font-inktrap text-[#7d7d7d]">
                                No image
                              </div>
                            )}
                            <span className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-inktrap uppercase tracking-[0.6px] text-[#131313]">
                              {location.type || "Spot"}
                            </span>
                          </div>
                          <div className="mt-2 space-y-0.5 px-0.5">
                            <p className="text-sm font-inktrap text-[#131313] truncate">
                              {location.display_name}
                            </p>
                            <p className="text-[10px] font-anonymous text-[#7d7d7d] line-clamp-2">
                              {location.description || location.name}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-anonymous text-[#7d7d7d]">
                      No locations yet.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
