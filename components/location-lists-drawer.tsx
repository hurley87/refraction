'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LocationListWithCount, Location } from '@/lib/types';
import {
  filterByMapBounds,
  getEffectiveMapBounds,
  type MapBounds,
} from '@/lib/utils/map-bounds';

export type DrawerLocationSummary = Pick<
  Location,
  | 'id'
  | 'name'
  | 'description'
  | 'place_id'
  | 'latitude'
  | 'longitude'
  | 'context'
  | 'type'
  | 'points_value'
  | 'coin_image_url'
  | 'coin_image_thumb_url'
  | 'event_url'
>;

type DrawerList = LocationListWithCount & {
  locations?: Array<
    {
      membershipId: number;
    } & DrawerLocationSummary
  >;
};

interface UserLocation {
  latitude: number;
  longitude: number;
}

const isDev = process.env.NODE_ENV === 'development';

interface LocationListsDrawerProps {
  walletAddress?: string | null;
  onLocationFocus?: (location: DrawerLocationSummary) => void;
  mapBounds?: MapBounds | null;
  userLocation?: UserLocation | null;
  /** When false, defer loading list data until enabled (after map idle). */
  fetchEnabled?: boolean;
  collapseForMapCard?: boolean;
}

export default function LocationListsDrawer({
  walletAddress: _walletAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
  onLocationFocus,
  mapBounds,
  userLocation: _userLocation, // eslint-disable-line @typescript-eslint/no-unused-vars
  fetchEnabled = false,
  collapseForMapCard = false,
}: LocationListsDrawerProps) {
  const [lists, setLists] = useState<DrawerList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [hasFetchedLists, setHasFetchedLists] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const prevHasVisibleLocationsRef = useRef(false);
  const prevCollapseForMapCardRef = useRef(collapseForMapCard);

  useEffect(() => {
    if (!fetchEnabled || hasFetchedLists) return;

    const controller = new AbortController();
    const loadLists = async () => {
      setIsLoadingLists(true);
      try {
        const response = await fetch(
          '/api/location-lists?includeLocations=true',
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Failed to load lists');
        const responseData = await response.json();
        const data = responseData.data || responseData;
        const fetchedLists: DrawerList[] = data.lists || [];
        setLists(fetchedLists);
        setHasFetchedLists(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load location lists', error);
        }
      } finally {
        setIsLoadingLists(false);
      }
    };
    loadLists();
    return () => controller.abort();
  }, [fetchEnabled, hasFetchedLists]);

  const filteredLists = useMemo(() => {
    if (isDev) {
      console.log('[Filter] Starting filter with mapBounds:', mapBounds);
    }
    const effectiveBounds = getEffectiveMapBounds(mapBounds);
    if (isDev) {
      console.log('[Filter] Effective bounds:', effectiveBounds);
    }

    if (!effectiveBounds) {
      return [];
    }

    if (isDev) {
      console.log(
        `[Filter] Filtering ${lists.length} lists with bounds:`,
        effectiveBounds
      );
    }

    const filtered = lists
      .filter((list) => (list.locations?.length ?? 0) > 0)
      .map((list) => {
        const locs = list.locations ?? [];
        const totalLocations = locs.length;
        const filteredLocations = filterByMapBounds(locs, mapBounds);

        if (isDev) {
          console.log(
            `[Filter] List "${list.title}": ${filteredLocations.length}/${totalLocations} locations passed filter`
          );
        }

        return {
          ...list,
          locations: filteredLocations,
        };
      });

    const totalFiltered = filtered.reduce(
      (sum, list) => sum + (list.locations?.length || 0),
      0
    );
    const totalOriginal = lists.reduce(
      (sum, list) => sum + (list.locations?.length || 0),
      0
    );

    if (isDev) {
      console.log(
        `[Filter] Filtering complete. ${totalFiltered}/${totalOriginal} locations passed filter`
      );
    }

    if (isDev && totalFiltered === 0 && totalOriginal > 0) {
      console.warn(
        `[Filter] All ${totalOriginal} locations were filtered out!`,
        'Bounds:',
        effectiveBounds
      );
    }

    return filtered;
  }, [lists, mapBounds]);

  const hasVisibleLocations = useMemo(() => {
    if (isLoadingLists || !hasFetchedLists) return false;
    return filteredLists.some(
      (list) => list.locations && list.locations.length > 0
    );
  }, [filteredLists, isLoadingLists, hasFetchedLists]);

  const listsWithSpotsInView = useMemo(
    () => filteredLists.filter((list) => (list.locations?.length ?? 0) > 0),
    [filteredLists]
  );

  const hasAnyListLocations = useMemo(() => {
    if (isLoadingLists || !hasFetchedLists) return false;
    return lists.some((list) => (list.locations?.length ?? 0) > 0);
  }, [lists, isLoadingLists, hasFetchedLists]);

  useEffect(() => {
    if (collapseForMapCard) {
      setIsExpanded(false);
    }
  }, [collapseForMapCard]);

  useEffect(() => {
    const wasCollapsedForMap = prevCollapseForMapCardRef.current;
    if (wasCollapsedForMap && !collapseForMapCard && hasVisibleLocations) {
      setIsExpanded(true);
    }
    prevCollapseForMapCardRef.current = collapseForMapCard;
  }, [collapseForMapCard, hasVisibleLocations]);

  useEffect(() => {
    if (
      hasVisibleLocations &&
      !prevHasVisibleLocationsRef.current &&
      !collapseForMapCard
    ) {
      setIsExpanded(true);
    }
    prevHasVisibleLocationsRef.current = hasVisibleLocations;
  }, [hasVisibleLocations, collapseForMapCard]);

  if (isLoadingLists || !hasAnyListLocations || !hasVisibleLocations) {
    return null;
  }

  const showDiscoverBody = !collapseForMapCard;
  const listGridOpen = showDiscoverBody && isExpanded;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-3 pb-3">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="group flex w-full items-center justify-center py-2"
          aria-label={
            collapseForMapCard
              ? 'Discover minimized while a location is open'
              : isExpanded
                ? 'Collapse lists drawer'
                : 'Expand lists drawer'
          }
        >
          <span className="h-[3px] w-8 rounded-full bg-black/10 transition-colors group-hover:bg-black/20" />
        </button>

        {showDiscoverBody && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[15px]  font-medium tracking-[-0.3px] text-[#1a1a1a] title3">
                  Explore
                </p>
                <p className="text-xs font-anonymous text-[#888]">
                  Discover spots nearby
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[1px] text-[#1a1a1a] transition-all hover:bg-black/[0.08] active:scale-95"
                aria-label={isExpanded ? 'Collapse lists' : 'Expand lists'}
              >
                {isExpanded ? 'Hide' : 'View'}
                {isExpanded ? (
                  <ChevronDown className="h-2.5 w-2.5" />
                ) : (
                  <ChevronUp className="h-2.5 w-2.5" />
                )}
              </button>
            </div>

            <div
              className={`grid transition-all duration-300 ease-out ${
                listGridOpen
                  ? 'mt-3 grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="max-h-64 overflow-y-auto space-y-4">
                  {listsWithSpotsInView.map((list) => {
                    const visibleCount = list.locations?.length ?? 0;
                    return (
                      <div key={list.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className=" text-[#1a1a1a] title3">
                            {list.title}
                          </h3>
                          <span className="text-[10px] font-anonymous text-[#999]">
                            {`${visibleCount} spots`}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                          {(list.locations ?? []).map((location) => (
                            <article
                              key={location.membershipId}
                              onClick={() => onLocationFocus?.(location)}
                              className="group relative flex w-36 flex-shrink-0 flex-col rounded-xl bg-black/[0.02] p-1.5 transition-all hover:bg-black/[0.04] active:scale-[0.98] cursor-pointer"
                            >
                              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                                {location.coin_image_url ? (
                                  <Image
                                    src={location.coin_image_url}
                                    alt={location.name}
                                    fill
                                    sizes="144px"
                                    loading="lazy"
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-black/[0.04] text-[10px] font-anonymous text-[#999]">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="mt-1.5 px-0.5">
                                <p className=" text-[#1a1a1a] truncate leading-tight title3">
                                  {location.name}
                                </p>
                                <p className="text-[9px] font-anonymous text-[#888] truncate mt-0.5">
                                  {location.description || location.name}
                                </p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
