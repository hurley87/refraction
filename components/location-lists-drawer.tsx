"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [activeListId, setActiveListId] = useState<string | null>(null);
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
        setActiveListId((prev) => prev ?? fetchedLists[0]?.id ?? null);
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

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId),
    [lists, activeListId],
  );

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
              {activeList?.title || "Curated Lists"}
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
            {isExpanded ? "Hide List" : "View List"}
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-2 sm:flex-nowrap">
          {isLoadingLists
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-10 w-28 rounded-full bg-[#f4f4f4] animate-pulse sm:h-11 sm:w-32"
                />
              ))
            : lists.map((list) => {
                if (!list) return null;

                const isActive = list.id === activeListId;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setActiveListId(list.id)}
                    className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-inktrap transition sm:text-sm ${
                      isActive
                        ? "border-transparent bg-[#131313] text-white"
                        : "border-[#d5d5d5] text-[#131313] bg-white/80 hover:border-[#131313]"
                    }`}
                  >
                    <span>{list.title}</span>
                    <span className="ml-2 text-xs text-[#7d7d7d]">
                      {list.location_count}
                    </span>
                  </button>
                );
              })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] font-inktrap uppercase tracking-[0.8px] text-[#7d7d7d] sm:grid-cols-2 sm:gap-3 sm:text-xs">
          <div className="flex items-center justify-between rounded-full border border-[#dcdcdc] px-4 py-2 text-[#131313] sm:px-6">
            <span className="tracking-[1px]">
              {activeList?.location_count || 0} Locations
            </span>
            <MapPin className="h-3.5 w-3.5 text-[#7d7d7d]" />
          </div>
          <div className="flex items-center justify-between rounded-full border border-[#dcdcdc] px-4 py-2 text-[#131313] sm:px-6">
            <span className="tracking-[1px]">{visitedCount} Visited</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#7d7d7d]" />
          </div>
        </div> */}

        {isExpanded && (
          <div className="mt-6">
            {isLoadingLists ? (
              <div className="flex gap-4 overflow-x-hidden">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`card-skeleton-${index}`}
                    className="h-48 w-56 rounded-[28px] bg-[#f5f5f5] animate-pulse"
                  />
                ))}
              </div>
            ) : activeList?.locations && activeList.locations.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 bg-white">
                {activeList.locations.map((location) => (
                  <article
                    key={location.membershipId}
                    onClick={() => onLocationFocus?.(location)}
                    className="relative flex w-56 flex-shrink-0 flex-col rounded-[28px] border border-[#ededed] p-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.12)] cursor-pointer sm:w-64"
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-[22px] ">
                      {location.coin_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={location.coin_image_url}
                          alt={location.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-inktrap text-[#7d7d7d]">
                          No image
                        </div>
                      )}
                      <span className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-[10px] font-inktrap uppercase tracking-[0.8px] text-[#131313]">
                        {location.type || "Spot"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-inktrap text-[#131313]">
                        {location.display_name}
                      </p>
                      <p className="text-[11px] font-anonymous text-[#7d7d7d]">
                        {location.name}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm font-anonymous text-[#7d7d7d]">
                This list is still being curated. Check back soon!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
