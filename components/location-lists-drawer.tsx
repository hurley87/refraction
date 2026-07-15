'use client';

import { useEffect, useState, useMemo, useRef, type PointerEvent } from 'react';
import Image from 'next/image';
import type { LocationListWithCount, Location } from '@/lib/types';
import MapCard from '@/components/map/map-card';
import { MapCheckinAvatarStack } from '@/components/map/map-checkin-avatar-stack';
import type { MapCheckinAvatarEntry } from '@/lib/map/checkin-avatar-utils';
import {
  filterByMapBounds,
  getEffectiveMapBounds,
  type MapBounds,
} from '@/lib/utils/map-bounds';
import { formatLocationCategory } from '@/lib/utils/format-location-category';
import { cn } from '@/lib/utils';
import { useFavoriteLocations } from '@/hooks/useFavorites';

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

const FAVORITES_LIST_ID = '__favorites__';

/** Mobile bottom-sheet snap states. */
export type LocationListsSheetSize = 'collapsed' | 'peek' | 'full';

type SheetSize = LocationListsSheetSize;

const SHEET_DRAG_THRESHOLD_PX = 56;

export interface LocationListsSheetLayout {
  size: LocationListsSheetSize;
  heightPx: number;
}

interface LocationListsDrawerProps {
  onLocationFocus?: (location: DrawerLocationSummary) => void;
  mapBounds?: MapBounds | null;
  userLocation?: UserLocation | null;
  /** When false, defer loading list data until enabled (after map idle). */
  fetchEnabled?: boolean;
  collapseForMapCard?: boolean;
  /** Mobile bottom sheet (default) or desktop left sidebar body. */
  layout?: 'sheet' | 'sidebar';
  /** Sidebar only: fired when "View all" list detail opens or closes. */
  onListDetailChange?: (isOpen: boolean) => void;
  /** Mobile sheet only: height/size for controls that sit above the drawer. */
  onSheetLayoutChange?: (layout: LocationListsSheetLayout) => void;
  walletAddress?: string;
  favoritePlaceIds?: Set<string>;
  onToggleFavorite?: (placeId: string) => void;
  isFavoritePending?: boolean;
}

export default function LocationListsDrawer({
  onLocationFocus,
  mapBounds,
  userLocation: _userLocation, // eslint-disable-line @typescript-eslint/no-unused-vars
  fetchEnabled = false,
  collapseForMapCard = false,
  layout = 'sheet',
  onListDetailChange,
  onSheetLayoutChange,
  walletAddress,
  favoritePlaceIds,
  onToggleFavorite,
  isFavoritePending = false,
}: LocationListsDrawerProps) {
  const [lists, setLists] = useState<DrawerList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [hasFetchedLists, setHasFetchedLists] = useState(false);
  const [sheetSize, setSheetSize] = useState<SheetSize>('peek');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [checkinsByPlaceId, setCheckinsByPlaceId] = useState<
    Record<string, MapCheckinAvatarEntry[]>
  >({});
  const prevHasVisibleLocationsRef = useRef(false);
  const prevCollapseForMapCardRef = useRef(collapseForMapCard);
  const sheetPanelRef = useRef<HTMLDivElement | null>(null);
  const sheetDragRef = useRef<{
    pointerId: number;
    startY: number;
    startSize: SheetSize;
    moved: boolean;
  } | null>(null);

  const { data: favoriteLocations = [], isLoading: isLoadingFavorites } =
    useFavoriteLocations(fetchEnabled ? walletAddress : undefined);

  const favoriteDrawerLocations = useMemo(
    () =>
      favoriteLocations
        .filter((location) => location.id != null)
        .map((location) => ({
          membershipId: location.id as number,
          id: location.id,
          name: location.name,
          address: location.address,
          description: location.description,
          place_id: location.place_id,
          latitude: location.latitude,
          longitude: location.longitude,
          context: location.context,
          type: location.type,
          points_value: location.points_value,
          coin_image_url: location.coin_image_url,
          coin_image_thumb_url: location.coin_image_thumb_url,
          event_url: location.event_url,
        })),
    [favoriteLocations]
  );

  const filteredFavoriteLocations = useMemo(
    () => filterByMapBounds(favoriteDrawerLocations, mapBounds),
    [favoriteDrawerLocations, mapBounds]
  );

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

  const hasVisibleFavorites = filteredFavoriteLocations.length > 0;

  const visiblePlaceIds = useMemo(() => {
    const ids = new Set<string>();

    if (layout === 'sidebar' && selectedListId === FAVORITES_LIST_ID) {
      for (const location of filteredFavoriteLocations) {
        if (location.place_id) {
          ids.add(location.place_id);
        }
      }
      return [...ids];
    }

    if (layout === 'sidebar' && selectedList) {
      for (const location of selectedList.locations ?? []) {
        if (location.place_id) {
          ids.add(location.place_id);
        }
      }
      return [...ids];
    }

    for (const location of filteredFavoriteLocations) {
      if (location.place_id) {
        ids.add(location.place_id);
      }
    }

    for (const list of listsWithSpotsInView) {
      for (const location of list.locations ?? []) {
        if (location.place_id) {
          ids.add(location.place_id);
        }
      }
    }
    return [...ids];
  }, [
    layout,
    selectedList,
    selectedListId,
    listsWithSpotsInView,
    filteredFavoriteLocations,
  ]);

  useEffect(() => {
    if (!hasFetchedLists || visiblePlaceIds.length === 0) {
      return;
    }

    const controller = new AbortController();

    const loadCheckins = async () => {
      try {
        const params = new URLSearchParams({
          placeIds: visiblePlaceIds.join(','),
          limit: '3',
          purpose: 'avatars',
        });
        const response = await fetch(
          `/api/location-comments?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setCheckinsByPlaceId({});
          return;
        }
        const responseData = await response.json();
        const data = responseData.data || responseData;
        setCheckinsByPlaceId(
          (data.checkinsByPlaceId ?? {}) as Record<
            string,
            MapCheckinAvatarEntry[]
          >
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        setCheckinsByPlaceId({});
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadCheckins();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [hasFetchedLists, visiblePlaceIds]);

  const hasAnyListLocations = useMemo(() => {
    if (isLoadingLists || !hasFetchedLists) return false;
    return lists.some((list) => (list.locations?.length ?? 0) > 0);
  }, [lists, isLoadingLists, hasFetchedLists]);

  useEffect(() => {
    if (collapseForMapCard) {
      setSheetSize('collapsed');
      setSelectedListId(null);
    }
  }, [collapseForMapCard]);

  useEffect(() => {
    if (layout !== 'sidebar') return;
    onListDetailChange?.(selectedListId !== null);
  }, [layout, selectedListId, onListDetailChange]);

  useEffect(() => {
    const wasCollapsedForMap = prevCollapseForMapCardRef.current;
    if (wasCollapsedForMap && !collapseForMapCard && hasVisibleLocations) {
      setSheetSize('peek');
    }
    prevCollapseForMapCardRef.current = collapseForMapCard;
  }, [collapseForMapCard, hasVisibleLocations]);

  useEffect(() => {
    if (
      hasVisibleLocations &&
      !prevHasVisibleLocationsRef.current &&
      !collapseForMapCard
    ) {
      setSheetSize('peek');
    }
    prevHasVisibleLocationsRef.current = hasVisibleLocations;
  }, [hasVisibleLocations, collapseForMapCard]);

  useEffect(() => {
    if (layout === 'sidebar' || !onSheetLayoutChange) return;

    const report = () => {
      const el = sheetPanelRef.current;
      onSheetLayoutChange({
        size: collapseForMapCard ? 'collapsed' : sheetSize,
        heightPx: el ? el.getBoundingClientRect().height : 0,
      });
    };

    // Wait a frame so the sheet DOM/layout has settled after size changes.
    const frameId = window.requestAnimationFrame(report);
    const el = sheetPanelRef.current;
    if (!el) {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => report());
    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [
    layout,
    sheetSize,
    collapseForMapCard,
    onSheetLayoutChange,
    hasFetchedLists,
    isLoadingLists,
    hasAnyListLocations,
    hasVisibleLocations,
    hasVisibleFavorites,
    favoriteDrawerLocations.length,
    walletAddress,
    isLoadingFavorites,
  ]);

  useEffect(() => {
    if (layout === 'sidebar' || !onSheetLayoutChange) return;
    return () => {
      onSheetLayoutChange({ size: 'collapsed', heightPx: 0 });
    };
  }, [layout, onSheetLayoutChange]);

  if (isLoadingLists || !hasFetchedLists) {
    return null;
  }

  const hasFavorites = favoriteDrawerLocations.length > 0;
  const favoritesReady = !walletAddress || !isLoadingFavorites;

  if (!hasAnyListLocations && (!hasFavorites || !favoritesReady)) {
    return null;
  }

  const showSidebarDetail =
    layout === 'sidebar' &&
    selectedListId !== null &&
    (selectedListId === FAVORITES_LIST_ID
      ? hasVisibleFavorites
      : selectedList !== null && (selectedList.locations?.length ?? 0) > 0);

  if (!hasVisibleLocations && !showSidebarDetail && !hasVisibleFavorites) {
    return null;
  }

  const showDiscoverBody = !collapseForMapCard;
  const isSheetExpanded = sheetSize !== 'collapsed';
  const isSheetFull = sheetSize === 'full';
  const listGridOpen = showDiscoverBody && isSheetExpanded;
  const isSidebar = layout === 'sidebar';
  const isFavoritesDetailView =
    isSidebar && selectedListId === FAVORITES_LIST_ID && hasVisibleFavorites;
  const isListDetailView =
    isSidebar &&
    (isFavoritesDetailView ||
      (selectedList !== null && (selectedList.locations?.length ?? 0) > 0));

  const snapSheetFromDrag = (startSize: SheetSize, deltaY: number) => {
    // deltaY < 0 → finger moved up (expand); > 0 → finger moved down (collapse)
    if (deltaY < -SHEET_DRAG_THRESHOLD_PX) {
      setSheetSize(startSize === 'collapsed' ? 'peek' : 'full');
      return;
    }
    if (deltaY > SHEET_DRAG_THRESHOLD_PX) {
      setSheetSize(startSize === 'full' ? 'peek' : 'collapsed');
    }
  };

  const cycleSheetSize = () => {
    setSheetSize((prev) => {
      if (prev === 'collapsed') return 'peek';
      if (prev === 'peek') return 'full';
      return 'peek';
    });
  };

  const onSheetHandlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (collapseForMapCard) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startSize: sheetSize,
      moved: false,
    };
  };

  const onSheetHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientY - drag.startY) > 8) {
      drag.moved = true;
    }
  };

  const onSheetHandlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    sheetDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore if already released
    }
    const deltaY = event.clientY - drag.startY;
    if (drag.moved) {
      snapSheetFromDrag(drag.startSize, deltaY);
      return;
    }
    cycleSheetSize();
  };

  const renderMobileCarouselCard = (
    location: NonNullable<DrawerList['locations']>[number]
  ) => {
    const checkins = checkinsByPlaceId[location.place_id] ?? [];
    const imageSrc =
      location.coin_image_thumb_url || location.coin_image_url || null;

    return (
      <article
        key={location.membershipId}
        onClick={() => onLocationFocus?.(location)}
        className="group flex h-[206px] w-[206px] shrink-0 cursor-pointer flex-col items-start gap-2 aspect-square bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-100)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity active:opacity-90"
      >
        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={location.name}
              fill
              sizes="206px"
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/[0.04] font-anonymous text-[10px] text-[#999]">
              No image
            </div>
          )}
        </div>

        <div className="flex w-full flex-col items-center justify-end self-stretch bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)]">
          <div className="title5 w-full truncate text-left text-[#171717]">
            {location.name}
          </div>
          <div className="flex w-full min-h-0 items-center justify-between gap-1">
            <span className="label-small flex shrink-0 items-center justify-center gap-2 border border-[#171717] px-1 py-0.5 uppercase text-[#171717]">
              {formatLocationCategory(location.type)}
            </span>
            <MapCheckinAvatarStack
              checkins={checkins}
              className="ml-auto shrink-0"
            />
          </div>
        </div>
      </article>
    );
  };

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
      isFavorited={favoritePlaceIds?.has(location.place_id) ?? false}
      onToggleFavorite={
        onToggleFavorite ? () => onToggleFavorite(location.place_id) : undefined
      }
      isFavoriteLoading={isFavoritePending}
    />
  );

  const listBody = (
    <div
      className={
        isSidebar
          ? 'flex min-h-0 flex-1 flex-col gap-8 overflow-hidden'
          : cn('px-4 pb-3', isSheetFull && 'flex min-h-0 flex-1 flex-col')
      }
    >
      {isListDetailView ? (
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
              {isFavoritesDetailView ? 'Your Favorites' : selectedList?.title}
            </h2>
          </div>
        </div>
      ) : null}

      <div
        className={
          isSidebar
            ? 'flex min-h-0 flex-1 flex-col gap-8 overflow-hidden'
            : isSheetFull
              ? cn(
                  'mt-3 flex min-h-0 flex-1 flex-col transition-opacity duration-300',
                  listGridOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                )
              : cn(
                  'grid transition-all duration-300 ease-out',
                  listGridOpen
                    ? 'mt-3 grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                )
        }
      >
        <div
          className={
            isSidebar
              ? 'min-h-0 flex-1 overflow-hidden'
              : cn('overflow-hidden', isSheetFull && 'min-h-0 flex-1')
          }
        >
          <div
            className={
              isSidebar
                ? cn(
                    'flex h-full w-full flex-col gap-8 overflow-y-auto',
                    !isListDetailView && 'pr-1'
                  )
                : cn(
                    'space-y-4 overflow-y-auto overscroll-contain',
                    isSheetFull ? 'h-full min-h-0' : 'max-h-[280px]'
                  )
            }
          >
            {isListDetailView ? (
              <div className="flex w-full flex-wrap gap-2">
                {(isFavoritesDetailView
                  ? filteredFavoriteLocations
                  : (selectedList?.locations ?? [])
                ).map((location) => renderDrawerTile(location))}
              </div>
            ) : (
              <>
                {listsWithSpotsInView.map((list) => (
                  <div key={list.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="title4 min-w-0 text-[#1a1a1a]">
                        {list.title}
                      </h3>

                      <button
                        type="button"
                        onClick={() => setSelectedListId(list.id)}
                        className="label-medium flex h-7 w-[72px] shrink-0 items-center justify-center gap-[var(--sds-size-space-200)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-200)] py-[var(--sds-size-space-100)] uppercase tracking-wide text-[#313131] transition-opacity hover:opacity-80"
                      >
                        View all
                      </button>
                    </div>
                    <div
                      className={
                        isSidebar
                          ? 'flex gap-2 overflow-x-auto pb-1'
                          : 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'
                      }
                    >
                      {(list.locations ?? []).map((location) =>
                        isSidebar
                          ? renderDrawerTile(location)
                          : renderMobileCarouselCard(location)
                      )}
                    </div>
                  </div>
                ))}
                {hasVisibleFavorites ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="title3 min-w-0 text-[#1a1a1a]">
                        Your Favorites
                      </h3>
                      {isSidebar ? (
                        <button
                          type="button"
                          onClick={() => setSelectedListId(FAVORITES_LIST_ID)}
                          className="label-medium flex h-7 w-[72px] shrink-0 items-center justify-center gap-[var(--sds-size-space-200)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-200)] py-[var(--sds-size-space-100)] uppercase tracking-wide text-[#313131] transition-opacity hover:opacity-80"
                        >
                          View all
                        </button>
                      ) : (
                        <span className="font-anonymous shrink-0 text-[10px] text-[#999]">
                          {`${filteredFavoriteLocations.length} spots`}
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
                      {filteredFavoriteLocations.map((location) =>
                        isSidebar
                          ? renderDrawerTile(location)
                          : renderMobileCarouselCard(location)
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isSidebar) {
    if (
      isLoadingLists ||
      !hasFetchedLists ||
      (!hasAnyListLocations &&
        (!hasFavorites || !favoritesReady) &&
        !collapseForMapCard) ||
      (!hasVisibleLocations && !showSidebarDetail && !hasVisibleFavorites)
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
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 flex',
        isSheetFull ? 'z-30 top-0' : 'z-20'
      )}
    >
      <div
        ref={sheetPanelRef}
        className={cn(
          'pointer-events-auto flex w-full flex-col overflow-hidden bg-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-[height,border-radius] duration-300',
          isSheetFull
            ? 'h-dvh rounded-none border-0 pb-[env(safe-area-inset-bottom)]'
            : 'rounded-t-2xl border border-b-0 border-black/[0.06] pb-[max(0.75rem,env(safe-area-inset-bottom))]'
        )}
      >
        <button
          type="button"
          onPointerDown={onSheetHandlePointerDown}
          onPointerMove={onSheetHandlePointerMove}
          onPointerUp={onSheetHandlePointerUp}
          onPointerCancel={onSheetHandlePointerUp}
          className="group flex w-full shrink-0 touch-none items-center justify-center py-3"
          aria-label={
            collapseForMapCard
              ? 'Discover minimized while a location is open'
              : isSheetFull
                ? 'Pull down to shrink lists drawer'
                : 'Pull up for full screen lists drawer'
          }
        >
          <span className="h-[3px] w-8 rounded-full bg-black/10 transition-colors group-hover:bg-black/20" />
        </button>

        {showDiscoverBody ? listBody : null}
      </div>
    </div>
  );
}
