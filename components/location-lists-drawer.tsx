'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LocationListWithCount, Location } from '@/lib/types';
import MapCard from '@/components/map/map-card';
import type { MapCheckinAvatarEntry } from '@/lib/map/checkin-avatar-utils';
import {
  filterByMapBounds,
  getEffectiveMapBounds,
  type MapBounds,
} from '@/lib/utils/map-bounds';

export type DrawerLocationSummary = Pick<
  Location,
  | 'id'
  | 'name'
  | 'address'
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
  /** Mobile bottom sheet (default) or desktop left sidebar body. */
  layout?: 'sheet' | 'sidebar';
}

export default function LocationListsDrawer({
  walletAddress,
  onLocationFocus,
  mapBounds,
  userLocation: _userLocation, // eslint-disable-line @typescript-eslint/no-unused-vars
  fetchEnabled = false,
  collapseForMapCard = false,
  layout = 'sheet',
}: LocationListsDrawerProps) {
  const [lists, setLists] = useState<DrawerList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [hasFetchedLists, setHasFetchedLists] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [checkinsByPlaceId, setCheckinsByPlaceId] = useState<
    Record<string, MapCheckinAvatarEntry[]>
  >({});
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

  const selectedList = useMemo(
    () =>
      selectedListId
        ? (lists.find((list) => list.id === selectedListId) ?? null)
        : null,
    [lists, selectedListId]
  );

  const visiblePlaceIds = useMemo(() => {
    const ids = new Set<string>();

    if (layout === 'sidebar' && selectedList) {
      for (const location of selectedList.locations ?? []) {
        if (location.place_id) {
          ids.add(location.place_id);
        }
      }
      return [...ids];
    }

    for (const list of listsWithSpotsInView) {
      for (const location of list.locations ?? []) {
        if (location.place_id) {
          ids.add(location.place_id);
        }
      }
    }
    return [...ids];
  }, [layout, selectedList, listsWithSpotsInView]);

  useEffect(() => {
    if (
      layout !== 'sidebar' ||
      !hasFetchedLists ||
      visiblePlaceIds.length === 0
    ) {
      return;
    }

    const controller = new AbortController();

    const loadCheckins = async () => {
      const entries = await Promise.all(
        visiblePlaceIds.map(async (placeId) => {
          try {
            const params = new URLSearchParams({ placeId, limit: '3' });
            if (walletAddress) {
              params.set('walletAddress', walletAddress);
            }
            const response = await fetch(
              `/api/location-comments?${params.toString()}`,
              { signal: controller.signal }
            );
            if (!response.ok) {
              return [placeId, []] as const;
            }
            const responseData = await response.json();
            const data = responseData.data || responseData;
            const checkins = (data.checkins || []) as MapCheckinAvatarEntry[];
            return [placeId, checkins] as const;
          } catch (error) {
            if ((error as Error).name === 'AbortError') {
              throw error;
            }
            return [placeId, []] as const;
          }
        })
      );

      setCheckinsByPlaceId(Object.fromEntries(entries));
    };

    void loadCheckins().catch(() => undefined);

    return () => controller.abort();
  }, [layout, hasFetchedLists, visiblePlaceIds, walletAddress]);

  const hasAnyListLocations = useMemo(() => {
    if (isLoadingLists || !hasFetchedLists) return false;
    return lists.some((list) => (list.locations?.length ?? 0) > 0);
  }, [lists, isLoadingLists, hasFetchedLists]);

  useEffect(() => {
    if (collapseForMapCard) {
      setIsExpanded(false);
      setSelectedListId(null);
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

  if (isLoadingLists || !hasAnyListLocations) {
    return null;
  }

  const showSidebarDetail =
    layout === 'sidebar' &&
    selectedListId !== null &&
    selectedList !== null &&
    (selectedList.locations?.length ?? 0) > 0;

  if (!hasVisibleLocations && !showSidebarDetail) {
    return null;
  }

  const showDiscoverBody = !collapseForMapCard;
  const listGridOpen = showDiscoverBody && isExpanded;
  const isSidebar = layout === 'sidebar';
  const isListDetailView = isSidebar && selectedList !== null;

  const renderDrawerTile = (
    location: NonNullable<DrawerList['locations']>[number]
  ) => (
    <MapCard
      key={location.membershipId}
      variant="drawerTile"
      name={location.name}
      address={
        location.address?.trim() || location.context?.trim() || location.name
      }
      description={location.description}
      type={location.type}
      imageUrl={location.coin_image_thumb_url || location.coin_image_url}
      eventUrl={location.event_url}
      isExisting
      recentCheckins={checkinsByPlaceId[location.place_id] ?? []}
      onAction={() => onLocationFocus?.(location)}
    />
  );

  const listBody = (
    <div
      className={
        isSidebar
          ? 'flex min-h-0 flex-1 flex-col gap-8 overflow-hidden'
          : 'px-4 pb-3'
      }
    >
      {!isSidebar ? (
        <div className="flex items-center justify-between">
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
      ) : null}

      {isListDetailView && selectedList ? (
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedListId(null)}
            className="flex size-10 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-80"
            aria-label="Back to all lists"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              className="aspect-square size-6 shrink-0"
              aria-hidden
            >
              <path
                d="M21.9995 10.1429H8.0183L12.1756 6.28368L9.88918 4L1.99951 11.9846L9.88918 20L12.1756 17.7139L8.00185 13.8547H21.9995V10.1429Z"
                fill="#757575"
              />
            </svg>
          </button>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="label-medium flex items-center gap-[var(--sds-size-space-200)] rounded uppercase text-[#757575]">
              MAP LIST
            </span>
            <h2 className="title3 min-w-0  text-[#171717] mapHd:text-[42px] mapHd:font-medium mapHd:leading-[40px]">
              {selectedList.title}
            </h2>
          </div>
        </div>
      ) : null}

      <div
        className={
          isSidebar
            ? 'flex min-h-0 flex-1 flex-col gap-8 overflow-hidden'
            : `grid transition-all duration-300 ease-out ${
                listGridOpen
                  ? 'mt-3 grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`
        }
      >
        <div
          className={
            isSidebar ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-hidden'
          }
        >
          <div
            className={
              isSidebar
                ? 'flex h-full flex-col gap-8 overflow-y-auto pr-1'
                : 'max-h-64 space-y-4 overflow-y-auto'
            }
          >
            {isListDetailView && selectedList ? (
              <div className="flex flex-wrap gap-2">
                {(selectedList.locations ?? []).map((location) =>
                  renderDrawerTile(location)
                )}
              </div>
            ) : (
              listsWithSpotsInView.map((list) => (
                <div key={list.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="title3 min-w-0 text-[#1a1a1a]">
                      {list.title}
                    </h3>
                    {isSidebar ? (
                      <button
                        type="button"
                        onClick={() => setSelectedListId(list.id)}
                        className="label-medium flex h-7 w-[72px] shrink-0 items-center justify-center gap-[var(--sds-size-space-200)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-200)] py-[var(--sds-size-space-100)] uppercase tracking-wide text-[#313131] transition-opacity hover:opacity-80"
                      >
                        View all
                      </button>
                    ) : (
                      <span className="font-anonymous shrink-0 text-[10px] text-[#999]">
                        {`${list.locations?.length ?? 0} spots`}
                      </span>
                    )}
                  </div>
                  <div
                    className={
                      isSidebar
                        ? 'flex gap-2 overflow-x-auto pb-1'
                        : 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'
                    }
                  >
                    {(list.locations ?? []).map((location) =>
                      isSidebar ? (
                        renderDrawerTile(location)
                      ) : (
                        <article
                          key={location.membershipId}
                          onClick={() => onLocationFocus?.(location)}
                          className="group relative flex w-36 flex-shrink-0 cursor-pointer flex-col rounded-xl bg-black/[0.02] p-1.5 transition-all hover:bg-black/[0.04] active:scale-[0.98]"
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
                              <div className="flex h-full w-full items-center justify-center bg-black/[0.04] font-anonymous text-[10px] text-[#999]">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5 px-0.5">
                            <p className="title3 truncate leading-tight text-[#1a1a1a]">
                              {location.name}
                            </p>
                            <p className="mt-0.5 truncate font-anonymous text-[9px] text-[#888]">
                              {location.description || location.name}
                            </p>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isSidebar) {
    if (
      isLoadingLists ||
      !hasAnyListLocations ||
      (!hasVisibleLocations && !showSidebarDetail && !collapseForMapCard)
    ) {
      return null;
    }

    if (collapseForMapCard) {
      return (
        <div className="pointer-events-auto flex w-full flex-col items-center">
          <button
            type="button"
            className="group flex w-full items-center justify-center py-2"
            aria-label="Discover minimized while a location is open"
          >
            <span className="h-[3px] w-8 rounded-full bg-black/10 transition-colors group-hover:bg-black/20" />
          </button>
        </div>
      );
    }

    return (
      <div className="pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {listBody}
      </div>
    );
  }

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

        {showDiscoverBody ? listBody : null}
      </div>
    </div>
  );
}
