'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Map from 'react-map-gl/mapbox';
import {
  MapboxGeocodeFeature,
  getSearchResultFlyToZoom,
  isMapSearchGeneralAreaFeatureType,
  mergePoiAndAddressReverseGeocode,
  mergeSearchBoxReverseFeatures,
} from '@/lib/utils/location-autofill';
import { useModalStatus, usePrivy } from '@privy-io/react-auth';
import { useMapGateAnalytics } from '@/hooks/use-map-gate-analytics';
import { useQuery } from '@tanstack/react-query';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { toast } from 'sonner';
import { useFavoritePlaceIds, useToggleFavorite } from '@/hooks/useFavorites';
import { usePlayerCustomLists } from '@/hooks/usePlayerCustomLists';
import AddToListDrawer from '@/components/map/add-to-list-drawer';
import MapNav from '@/components/map/mapnav';
import { MapDesktopNav } from '@/components/map/map-desktop-nav';
import MapCard from '@/components/map/map-card';
import { MapWelcomeTour } from '@/components/map/map-welcome-tour';
import { MapYellowTip } from '@/components/map/map-yellow-tip';
import { PlayerLocationPrompt } from '@/components/map/player-location-prompt';
import { MapLocateButton } from '@/components/map/map-locate-button';
import { MapSearchField } from '@/components/map/map-search-field';
import { MapErrorOverlay } from '@/components/map/map-error-overlay';
import { MapMarkersLayer } from '@/components/map/map-markers-layer';
import { MapCreateLocationDrawer } from '@/components/map/map-create-location-drawer';
import { CheckInCommentDialog } from '@/components/map/check-in-comment-dialog';
import { LocationCheckInDialog } from '@/components/map/location-check-in-dialog';
import LocationListsDrawer, {
  DrawerLocationSummary,
  type LocationListsSheetLayout,
} from '@/components/location-lists-drawer';
import { cn } from '@/lib/utils';
import { buildDeepLinkMarkerFromQueryCoords } from '@/lib/utils/map-deep-link-marker';
import { normalizePlaceName } from '@/lib/utils/place-name-match';
import {
  filterByMapBounds,
  lngLatBoundsFromPoints,
  parseLatLng,
} from '@/lib/utils/map-bounds';
import type { LocationCategory } from '@/lib/types';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { useMapPlayerProfile } from '@/hooks/use-map-player-profile';
import { useMapOnboarding } from '@/hooks/use-map-onboarding';
import type {
  MarkerData,
  LocationCheckinPreview,
  LocationFormData,
  CategoryOption,
  FormStep,
} from '@/components/map/interactive-map-types';
import {
  markerFromListLocation,
  findNearestIrLMarker,
  findExistingMarker as findExistingMarkerInList,
} from '@/lib/map/marker-utils';
import {
  getListFocusMapPadding,
  getMapCardFlyToBottomPaddingPx,
} from '@/lib/map/map-layout';
import {
  shouldReopenMapCardAfterCheckInClose,
  shouldShowSaveToListTipAfterCheckIn,
} from '@/lib/map/post-checkin-map-restore';
/** Privy ignores `login()` while its modal is unmounting, so wait before reopening. */
const LOGIN_REPROMPT_DELAY_MS = 400;

interface InteractiveMapProps {
  initialPlaceId?: string | null;
  /** Shared links use `?name=` (location display name); matched case-insensitively. */
  initialPlaceName?: string | null;
  initialLatitude?: number;
  initialLongitude?: number;
  /**
   * When true with `initialPlaceId`, fly to the pin and open the bottom MapCard only.
   * When false (default), open the full-screen check-in flow (e.g. shared links).
   */
  deepLinkMapCardOnly?: boolean;
  /** When set (e.g. from `returnTo` query), replace IRL logo with back control to this path. */
  guideReturnHref?: string | null;
  /** Dashboard deep link: open lists drawer focused on this player custom list UUID. */
  initialCustomListId?: string | null;
  /** Public profile deep link: open read-only detail for another player's list UUID. */
  initialPublicProfileListId?: string | null;
  /** Curated list deep link: open detail for this `location_lists.id`. */
  initialCuratedListId?: string | null;
}

export default function InteractiveMap({
  initialPlaceId,
  initialPlaceName,
  initialLatitude,
  initialLongitude,
  deepLinkMapCardOnly = false,
  guideReturnHref = null,
  initialCustomListId = null,
  initialPublicProfileListId = null,
  initialCuratedListId = null,
}: InteractiveMapProps) {
  const guideReturnPersistedRef = useRef<string | null>(null);
  if (guideReturnHref) {
    guideReturnPersistedRef.current = guideReturnHref;
  }
  const effectiveGuideReturnHref =
    guideReturnHref ?? guideReturnPersistedRef.current;

  const { user, ready, authenticated, getAccessToken, login } = usePrivy();
  const { isOpen: isPrivyModalOpen } = useModalStatus();
  useMapGateAnalytics({ ready, authenticated, isPrivyModalOpen });
  const walletAddress = useEvmWalletAddress();
  const { data: favoritePlaceIds } = useFavoritePlaceIds(walletAddress);
  const { mutate: toggleFavorite, isPending: isFavoritePending } =
    useToggleFavorite(walletAddress);
  const {
    userUsername,
    userProfileSummary,
    needsLocationPrompt,
    setNeedsLocationPrompt,
  } = useMapPlayerProfile(walletAddress);

  const [viewState, setViewState] = useState({
    longitude: initialLongitude ?? -73.9442,
    latitude: initialLatitude ?? 40.7081,
    zoom: initialLatitude != null && initialLongitude != null ? 12 : 8,
  });

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [listFocusLocations, setListFocusLocations] = useState<
    DrawerLocationSummary[] | null
  >(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);
  /** Location whose ADD TO LIST drawer is open (replaces the map card). */
  const [addToListTarget, setAddToListTarget] = useState<MarkerData | null>(
    null
  );
  /** Keep the marker for create-handoff even if add-to-list state clears mid-await. */
  const addToListTargetRef = useRef<MarkerData | null>(null);
  addToListTargetRef.current = addToListTarget;
  /** Focus the discover drawer on this custom list after creating one. */
  const [focusCustomListId, setFocusCustomListId] = useState<string | null>(
    null
  );
  const { data: popupCustomLists = [] } = usePlayerCustomLists(
    walletAddress,
    popupInfo?.place_id
  );
  const popupSavedListCount = popupCustomLists.filter(
    (list) => list.contains_location
  ).length;

  // Close the ADD TO LIST drawer whenever its map card goes away.
  useEffect(() => {
    if (!popupInfo) setAddToListTarget(null);
  }, [popupInfo]);

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('business-details');
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState({ creation: 0, checkIn: 0 });
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    description: '',
    categoryId: '',
    locationImage: null,
    checkInComment: '',
  });

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const responseData = await response.json();
      const data = responseData.data ?? responseData;
      return Array.isArray(data) ? data : [];
    },
  });
  /** Reverse-geocoded spot from map click or search — not yet an IRL location; show compact card before create form. */
  const [pendingMapCreateMarker, setPendingMapCreateMarker] =
    useState<MarkerData | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckInCommentModal, setShowCheckInCommentModal] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<MarkerData | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [checkInComment, setCheckInComment] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInPointsEarned, setCheckInPointsEarned] = useState(0);
  const [checkInTotalPoints, setCheckInTotalPoints] = useState(0);
  const [locationCheckins, setLocationCheckins] = useState<
    LocationCheckinPreview[]
  >([]);
  const [isLoadingLocationCheckins, setIsLoadingLocationCheckins] =
    useState(false);
  /** From GET /api/location-comments when walletAddress is sent — any check-in counts (incl. no comment). */
  const [hasUserCheckedInAtLocation, setHasUserCheckedInAtLocation] =
    useState(false);
  const [locationCheckinsError, setLocationCheckinsError] = useState<
    string | null
  >(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Seeded from viewState on mount; refined from the map instance when WebGL is available.
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  /** Set when Mapbox / WebGL fails so we can show guidance instead of a blank map. */
  const [mapRenderError, setMapRenderError] = useState<string | null>(null);
  /** Defer discover drawer list fetch until after the map has loaded. */
  const [discoverListsEnabled, setDiscoverListsEnabled] = useState(false);

  const mapRef = useRef<any>(null);
  const hasSetInitialLocationRef = useRef(false);
  const walletAddressRef = useRef<string | null | undefined>(walletAddress);
  /** True while the guest has the Privy modal open, so dismissing it re-prompts. */
  const wasLoginModalOpenRef = useRef(false);
  /**
   * First search after the welcome tour: if the member checks in before finishing
   * the save-to-list tip, restore that tip when they return to the map card.
   */
  const postTourFirstSearchTipRef = useRef(false);

  const {
    showListCreateMapTip,
    setShowListCreateMapTip,
    showSearchTourTip,
    showSaveToListTourTip,
    setShowSaveToListTourTip,
    showCreateListTourTip,
    setShowCreateListTourTip,
    pendingSaveToListTourTipRef,
    showWelcomeBanner,
    showLocationPrompt,
    dismissSearchTourTip,
    dismissSaveToListTourTip,
    dismissCreateListTourTip,
    dismissListCreateMapTip,
    handleWelcomeTourComplete,
    handleLocationPromptComplete,
    remindLocationCreationFlow,
  } = useMapOnboarding({
    user,
    walletAddress,
    walletAddressRef,
    needsLocationPrompt,
    setNeedsLocationPrompt,
  });

  const handleDismissSaveToListTourTip = useCallback(() => {
    postTourFirstSearchTipRef.current = false;
    dismissSaveToListTourTip();
  }, [dismissSaveToListTourTip]);

  const handleListCreated = useCallback(() => {
    const createdFromMarker = addToListTargetRef.current ?? addToListTarget;
    setAddToListTarget(null);
    setFocusCustomListId(null);
    dismissCreateListTourTip();

    if (!createdFromMarker) {
      toast.success('List created');
      return;
    }

    // Stay on the location that started save-to-list so the profile tip
    // is visible on the map card.
    setPopupInfo(createdFromMarker);
    setSelectedMarker(createdFromMarker);
    setShowListCreateMapTip(true);
  }, [addToListTarget, dismissCreateListTourTip, setShowListCreateMapTip]);

  // When initial coords are provided (e.g. from ?city= or ?lat=&lng=), center the map on them.
  // This runs when props change (e.g. after hydration when searchParams become available).
  useEffect(() => {
    if (
      initialLatitude != null &&
      initialLongitude != null &&
      !Number.isNaN(initialLatitude) &&
      !Number.isNaN(initialLongitude)
    ) {
      hasSetInitialLocationRef.current = true;
      setViewState((prev) => ({
        ...prev,
        latitude: initialLatitude,
        longitude: initialLongitude,
        zoom: Math.max(prev.zoom ?? 12, 12),
      }));
    }
  }, [initialLatitude, initialLongitude]);

  // Center map on user's current location once on mount (with fallback)
  // Skip geolocation if the map was opened with explicit city/coordinates.
  useEffect(() => {
    if (hasSetInitialLocationRef.current) return;
    if (initialLatitude != null && initialLongitude != null) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        hasSetInitialLocationRef.current = true;
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: Math.max(prev.zoom ?? 12, 14),
        }));
      },
      (error) => {
        // Code 2 (POSITION_UNAVAILABLE) is common on desktop without a precise fix; avoid noisy logs.
        if (
          process.env.NODE_ENV === 'development' &&
          error.code !== error.POSITION_UNAVAILABLE
        ) {
          console.warn('Geolocation error:', error);
        }
      },
      // Low accuracy works far more reliably than GPS-style fixes on laptops / Wi‑Fi.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, [initialLatitude, initialLongitude]);

  // Keep wallet address ref in sync
  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  // The map requires an account: open Privy before the welcome tour, and reopen
  // it whenever a guest dismisses the modal without finishing sign-in.
  useEffect(() => {
    if (!ready || authenticated || user) {
      wasLoginModalOpenRef.current = false;
      return;
    }

    if (isPrivyModalOpen) {
      wasLoginModalOpenRef.current = true;
      return;
    }

    const delay = wasLoginModalOpenRef.current ? LOGIN_REPROMPT_DELAY_MS : 0;
    wasLoginModalOpenRef.current = false;
    const timeout = setTimeout(() => login(), delay);
    return () => clearTimeout(timeout);
  }, [ready, authenticated, user, isPrivyModalOpen, login]);

  // Load markers from DB on mount
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const response = await fetch('/api/locations');
        if (!response.ok) return;
        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper - data is in responseData.data
        const data = responseData.data || responseData;
        const dbMarkers: MarkerData[] = (data.locations || []).map(
          (loc: any) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            place_id: loc.place_id,
            name: loc.name,
            address: loc.address ?? loc.name, // Fallback to name if address not set
            description: loc.description ?? null,
            creator_wallet_address: loc.creator_wallet_address ?? null,
            creator_username: loc.creator_username ?? null,
            imageUrl: loc.coin_image_url ?? null,
            imageThumbUrl: loc.coin_image_thumb_url ?? null,
            category: loc.category ?? null,
            event_url: loc.event_url ?? null,
            points_value: loc.points_value ?? 100,
          })
        );
        setMarkers(dbMarkers);
      } catch (e) {
        console.error('Failed to load locations:', e);
      }
    };
    loadMarkers();
  }, []);

  const visibleMarkers = useMemo(() => {
    if (listFocusLocations) {
      const byPlaceId = Object.fromEntries(
        markers.map((marker) => [marker.place_id, marker])
      );
      return listFocusLocations.flatMap((location) => {
        const marker = markerFromListLocation(
          location,
          byPlaceId[location.place_id]
        );
        return marker ? [marker] : [];
      });
    }

    if (!mapBounds) return [];

    const alwaysInclude = [
      selectedMarker?.place_id,
      popupInfo?.place_id,
    ].filter((id): id is string => Boolean(id));

    return filterByMapBounds(markers, mapBounds, {
      alwaysIncludePlaceIds: alwaysInclude,
    });
  }, [
    listFocusLocations,
    markers,
    mapBounds,
    selectedMarker?.place_id,
    popupInfo?.place_id,
  ]);

  const listFocusKey = listFocusLocations
    ? listFocusLocations.map((location) => location.place_id).join('|')
    : null;

  useEffect(() => {
    if (!listFocusLocations) return;
    const ids = new Set(
      listFocusLocations.map((location) => location.place_id)
    );
    setPopupInfo((current) =>
      current && !ids.has(current.place_id) ? null : current
    );
    setSelectedMarker((current) =>
      current && !ids.has(current.place_id) ? null : current
    );
  }, [listFocusKey, listFocusLocations]);

  useEffect(() => {
    if (!listFocusLocations || listFocusLocations.length === 0) return;

    const points = listFocusLocations
      .map((location) => parseLatLng(location.latitude, location.longitude))
      .filter((point): point is NonNullable<typeof point> => point !== null);
    const bounds = lngLatBoundsFromPoints(points);
    if (!bounds) return;

    const timeoutId = window.setTimeout(() => {
      const map = mapRef.current;
      const fitBounds = map?.fitBounds?.bind(map) ?? map?.getMap?.()?.fitBounds;
      if (!fitBounds) return;
      fitBounds(bounds, {
        padding: getListFocusMapPadding(),
        duration: 1000,
        maxZoom: 14,
        essential: true,
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [listFocusKey, listFocusLocations]);

  /**
   * Calculate map bounds from mapRef or fallback to viewState.
   * Always tries to get actual bounds from the map instance first.
   */
  const calculateMapBounds = useCallback(
    (currentViewState?: typeof viewState) => {
      // Always try to get bounds directly from map instance first (most accurate)
      if (mapRef.current) {
        try {
          // Try getMap() first (for react-map-gl/mapbox)
          const map = mapRef.current.getMap?.();
          if (map && typeof map.getBounds === 'function') {
            const bounds = map.getBounds();
            if (bounds && typeof bounds.getNorth === 'function') {
              const calculatedBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
              };
              if (process.env.NODE_ENV === 'development') {
                console.log(
                  '[MapBounds] Calculated from map instance:',
                  calculatedBounds
                );
              }
              return calculatedBounds;
            }
          }
          // Fallback: try getBounds() directly on the ref (some map libraries)
          if (typeof mapRef.current.getBounds === 'function') {
            const bounds = mapRef.current.getBounds();
            if (bounds && typeof bounds.getNorth === 'function') {
              const calculatedBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
              };
              if (process.env.NODE_ENV === 'development') {
                console.log(
                  '[MapBounds] Calculated from ref.getBounds():',
                  calculatedBounds
                );
              }
              return calculatedBounds;
            }
          }
        } catch (error) {
          console.warn('[MapBounds] Failed to get map bounds:', error);
        }
      }

      // Fallback: approximate bounds from viewState (center + zoom)
      // Use provided viewState or current state
      const stateToUse = currentViewState || viewState;
      const { latitude, longitude, zoom } = stateToUse;
      const zoomFactor = Math.pow(2, zoom);
      // Approximate degrees per pixel (rough estimate)
      // At zoom 0: ~360 degrees / 256 pixels = ~1.4 degrees per pixel
      // Each zoom level doubles the resolution
      const degreesPerPixel = 360 / (256 * zoomFactor);
      // Approximate viewport dimensions (assuming ~800px width, ~600px height)
      const viewportWidthDegrees = 800 * degreesPerPixel;
      const viewportHeightDegrees = 600 * degreesPerPixel;

      const fallbackBounds = {
        north: latitude + viewportHeightDegrees / 2,
        south: latitude - viewportHeightDegrees / 2,
        east: longitude + viewportWidthDegrees / 2,
        west: longitude - viewportWidthDegrees / 2,
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('[MapBounds] Calculated fallback from viewState:', {
          center: { latitude, longitude },
          zoom,
          bounds: fallbackBounds,
        });
      }
      return fallbackBounds;
    },
    [viewState]
  );

  // Keep list-drawer bounds in sync before the map fires move/load (slow init or WebGL failure).
  useEffect(() => {
    const bounds = calculateMapBounds(viewState);
    if (bounds) {
      setMapBounds(bounds);
    }
    // Intentionally lat/lng/zoom only: full viewState changes every pan frame while onMove already updates bounds when WebGL is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewState.latitude,
    viewState.longitude,
    viewState.zoom,
    calculateMapBounds,
  ]);

  // Handle deep link to specific location via placeId or placeName URL param
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    const placeNameQuery = initialPlaceName?.trim();
    if ((!initialPlaceId && !placeNameQuery) || deepLinkHandledRef.current)
      return;

    const matchedById = initialPlaceId
      ? markers.find((m) => m.place_id === initialPlaceId)
      : undefined;
    const placeNameKey = placeNameQuery
      ? normalizePlaceName(placeNameQuery)
      : '';
    const matchedByName = placeNameKey
      ? markers.find(
          (m) => normalizePlaceName(m.name?.trim() || '') === placeNameKey
        )
      : undefined;
    const matchedMarker = matchedById ?? matchedByName;

    const coordsFromQuery =
      initialLatitude != null &&
      initialLongitude != null &&
      !Number.isNaN(initialLatitude) &&
      !Number.isNaN(initialLongitude);

    const syntheticMarker =
      deepLinkMapCardOnly && coordsFromQuery && initialPlaceId
        ? buildDeepLinkMarkerFromQueryCoords(
            initialPlaceId,
            initialLatitude,
            initialLongitude,
            { name: placeNameQuery }
          )
        : null;

    // Wait for /api/locations before using query lat/lng fallback so we do not open a stub
    // marker when the real pin would appear on the next markers update.
    const targetMarker =
      matchedMarker ?? (markers.length > 0 ? syntheticMarker : null);

    if (!targetMarker) {
      if (markers.length === 0) return;
      return;
    }

    deepLinkHandledRef.current = true;
    const targetZoom = Math.max(viewState.zoom ?? 12, 15);
    const bottomPaddingPx = getMapCardFlyToBottomPaddingPx();

    mapRef.current?.flyTo?.({
      center: [targetMarker.longitude, targetMarker.latitude],
      zoom: targetZoom,
      duration: 1200,
      padding: { top: 0, bottom: bottomPaddingPx, left: 0, right: 0 },
    });

    setTimeout(() => {
      const bounds = calculateMapBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }, 1300);

    if (deepLinkMapCardOnly) {
      setPopupInfo(targetMarker);
      setSelectedMarker(targetMarker);
      setPendingMapCreateMarker(null);
    } else {
      setCheckInTarget(targetMarker);
      setCheckInComment('');
      setCheckInSuccess(false);
      setLocationCheckins([]);
      setLocationCheckinsError(null);
      setShowCheckInModal(true);
      void loadLocationCheckins(targetMarker.place_id);
    }
  }, [
    initialPlaceId,
    initialPlaceName,
    initialLatitude,
    initialLongitude,
    markers,
    viewState.zoom,
    calculateMapBounds,
    deepLinkMapCardOnly,
  ]);

  const loadLocationCheckins = async (placeId: string) => {
    if (!placeId) return;
    setIsLoadingLocationCheckins(true);
    setLocationCheckinsError(null);
    try {
      const params = new URLSearchParams({ placeId });
      if (walletAddress) {
        params.set('walletAddress', walletAddress);
      }
      const response = await fetch(
        `/api/location-comments?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      setLocationCheckins(data.checkins || []);
      setHasUserCheckedInAtLocation(Boolean(data.hasUserCheckedIn));
    } catch (error) {
      console.error('Failed to load location check-ins:', error);
      setLocationCheckins([]);
      setHasUserCheckedInAtLocation(false);
      setLocationCheckinsError('Unable to load check-ins right now.');
    } finally {
      setIsLoadingLocationCheckins(false);
    }
  };

  const findExistingMarker = (placeId?: string | null) =>
    findExistingMarkerInList(markers, placeId);

  // Add markers by clicking the map
  const onMapClick = async (event: any) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to create locations');
      return;
    }

    if (showLocationForm) {
      if (isCreatingLocation) {
        return;
      }
      handleCloseLocationForm();
    }

    setPendingMapCreateMarker(null);

    const { lngLat } = event;
    const longitude = lngLat.lng;
    const latitude = lngLat.lat;

    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const geocodeBaseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
      // Search Box /reverse returns multiple feature types (POI + address) in one response — better
      // POI coverage than Geocoding v5 for the same coordinates. Fall back to dual Geocoding requests.
      const searchBoxReverseUrl = `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${longitude}&latitude=${latitude}&limit=10&access_token=${token}`;
      const searchBoxRes = await fetch(searchBoxReverseUrl);
      let mergedFromSearchBox = null as ReturnType<
        typeof mergeSearchBoxReverseFeatures
      >;
      if (searchBoxRes.ok) {
        const searchBoxData = await searchBoxRes.json();
        mergedFromSearchBox = mergeSearchBoxReverseFeatures(
          searchBoxData.features,
          { click: { latitude, longitude } }
        );
      }

      let resolvedName: string;
      let resolvedAddress: string;
      let placeId: string;

      if (mergedFromSearchBox) {
        resolvedName = mergedFromSearchBox.name;
        resolvedAddress = mergedFromSearchBox.address;
        placeId = mergedFromSearchBox.mapboxId || `temp-${Date.now()}`;
      } else {
        const [poiResponse, addressResponse] = await Promise.all([
          fetch(`${geocodeBaseUrl}?access_token=${token}&types=poi&limit=1`),
          fetch(
            `${geocodeBaseUrl}?access_token=${token}&types=address&limit=1`
          ),
        ]);

        let poiFeature: MapboxGeocodeFeature | undefined;
        let addressFeature: MapboxGeocodeFeature | undefined;
        if (poiResponse.ok) {
          const poiData = await poiResponse.json();
          poiFeature = poiData.features?.[0];
        }
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          addressFeature = addressData.features?.[0];
        }

        if (!poiFeature && !addressFeature) {
          throw new Error('No reverse geocode features');
        }

        const merged = mergePoiAndAddressReverseGeocode(
          poiFeature,
          addressFeature,
          { click: { latitude, longitude } }
        );
        resolvedName = merged.name;
        resolvedAddress = merged.address;
        placeId = poiFeature?.id || addressFeature?.id || `temp-${Date.now()}`;
      }

      const newMarker: MarkerData = {
        latitude,
        longitude,
        place_id: placeId,
        name: resolvedName,
        address: resolvedAddress,
      };
      const duplicateMarker = findExistingMarker(newMarker.place_id);
      if (duplicateMarker) {
        toast.info('That location already exists—check it out instead!');
        setSelectedMarker(duplicateMarker);
        setPopupInfo(duplicateMarker);
        setShowLocationForm(false);
        setPendingMapCreateMarker(null);
        return;
      }

      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.name, // Venue name
        address: newMarker.address || newMarker.name, // Address
        description: '',
        categoryId: '',
        locationImage: null,
        checkInComment: '',
      });
      setFormStep('business-details');
      setPendingMapCreateMarker(newMarker);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Still allow creating even if reverse geocoding fails
      const fallbackAddress = `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      const newMarker: MarkerData = {
        latitude,
        longitude,
        place_id: `temp-${Date.now()}`,
        name: fallbackAddress, // Use coordinates as name
        address: fallbackAddress, // Use coordinates as address
      };

      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.name, // Venue name (coordinates)
        address: newMarker.address || newMarker.name, // Address (coordinates)
        description: '',
        categoryId: '',
        locationImage: null,
        checkInComment: '',
      });
      setFormStep('business-details');
      setPendingMapCreateMarker(newMarker);
    }
  };

  const handleOpenCreateFromPendingMapClick = () => {
    if (!pendingMapCreateMarker) return;
    setSelectedMarker(pendingMapCreateMarker);
    setFormData((prev) => ({
      ...prev,
      name: pendingMapCreateMarker.name,
      address: pendingMapCreateMarker.address || pendingMapCreateMarker.name,
      description: '',
      categoryId: '',
      locationImage: null,
      checkInComment: prev.checkInComment,
    }));
    setFormStep('business-details');
    setShowLocationForm(true);
    setPendingMapCreateMarker(null);
  };

  const handleSearchSelect = (picked: {
    longitude: number;
    latitude: number;
    id: string;
    name?: string;
    placeFormatted?: string;
    featureType?: string;
  }) => {
    if (showSearchTourTip) {
      pendingSaveToListTourTipRef.current = true;
    }
    const followFromSearchTour = pendingSaveToListTourTipRef.current;
    if (followFromSearchTour) {
      postTourFirstSearchTipRef.current = true;
    }
    dismissSearchTourTip();
    const { longitude, latitude, name, placeFormatted, id, featureType } =
      picked;

    const isGeneralArea = isMapSearchGeneralAreaFeatureType(featureType);
    const matchedMarker = isGeneralArea
      ? null
      : (findExistingMarker(id) ??
        findNearestIrLMarker(markers, latitude, longitude));

    const targetZoom = getSearchResultFlyToZoom(
      featureType,
      viewState.zoom ?? 12
    );

    const bottomPaddingPx = getMapCardFlyToBottomPaddingPx();

    mapRef.current?.flyTo?.({
      center: [longitude, latitude],
      zoom: targetZoom,
      duration: 1200,
      padding: { top: 0, bottom: bottomPaddingPx, left: 0, right: 0 },
    });

    const newViewState = { longitude, latitude, zoom: targetZoom };
    setViewState(newViewState);

    console.log('[MapBounds] Search selected:', {
      longitude,
      latitude,
      name,
      matchedIrL: Boolean(matchedMarker),
    });

    const immediateBounds = calculateMapBounds(newViewState);
    if (immediateBounds) {
      console.log(
        '[MapBounds] Setting immediate bounds after search:',
        immediateBounds
      );
      setMapBounds(immediateBounds);
    }

    setTimeout(() => {
      console.log('[MapBounds] Recalculating bounds after search delay');
      const bounds = calculateMapBounds();
      if (bounds) {
        console.log('[MapBounds] Setting final bounds after search:', bounds);
        setMapBounds(bounds);
      }
    }, 500);

    setTimeout(() => {
      const bounds = calculateMapBounds();
      if (bounds) setMapBounds(bounds);
    }, 1300);

    if (isGeneralArea) {
      setPopupInfo(null);
      setPendingMapCreateMarker(null);
      setSelectedMarker(null);
      return;
    }

    if (matchedMarker) {
      setPendingMapCreateMarker(null);
      setPopupInfo(matchedMarker);
      setSelectedMarker(matchedMarker);
      if (followFromSearchTour && walletAddress) {
        pendingSaveToListTourTipRef.current = false;
        setShowSaveToListTourTip(true);
      }
      return;
    }

    // No IRL listing at this suggestion: flow mirrors map click (wallet) or drawer-style fallback card.
    if (walletAddress) {
      const newMarker: MarkerData = {
        latitude,
        longitude,
        place_id: id,
        name: name?.trim() || 'Selected location',
        address:
          placeFormatted?.trim() ||
          name?.trim() ||
          `Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      };
      setPopupInfo(null);
      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.name,
        address: newMarker.address || newMarker.name,
        description: '',
        categoryId: '',
        locationImage: null,
        checkInComment: '',
      });
      setFormStep('business-details');
      setPendingMapCreateMarker(newMarker);
      return;
    }

    setPendingMapCreateMarker(null);
    setSelectedMarker(null);
    setPopupInfo({
      latitude,
      longitude,
      place_id: id || `search-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
      name: name?.trim() || 'Selected location',
      address:
        placeFormatted?.trim() ||
        name?.trim() ||
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      imageUrl: null,
      creator_wallet_address: null,
      creator_username: null,
      category: null,
      event_url: null,
    });
  };

  const handleMarkerClick = (marker: MarkerData) => {
    setPopupInfo(marker);
    setSelectedMarker(marker);
    setPendingMapCreateMarker(null);

    const targetZoom = Math.max(viewState.zoom ?? 12, 15);
    // Bottom padding keeps the pin in the visual center above the fixed map card overlay.
    const bottomPaddingPx = getMapCardFlyToBottomPaddingPx();

    mapRef.current?.flyTo?.({
      center: [marker.longitude, marker.latitude],
      zoom: targetZoom,
      duration: 1200,
      padding: { top: 0, bottom: bottomPaddingPx, left: 0, right: 0 },
    });

    setTimeout(() => {
      const bounds = calculateMapBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }, 1300);
  };

  const handleLocateUser = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      toast.error('Location services are unavailable on this device.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setUserLocation({ latitude, longitude });
        const targetZoom = Math.max(viewState.zoom ?? 12, 15);
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: targetZoom,
        }));

        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: targetZoom,
            speed: 1.5,
            curve: 1.2,
          });
        }

        // Update bounds after flyTo completes
        setTimeout(() => {
          const bounds = calculateMapBounds({
            longitude,
            latitude,
            zoom: targetZoom,
          });
          if (bounds) {
            setMapBounds(bounds);
          }
        }, 1500);

        setIsLocating(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information unavailable. Please check your device's location services.";
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        toast.error(errorMessage);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    );
  };

  const handleStartCheckIn = (marker: MarkerData) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to check in');
      return;
    }

    setCheckInTarget(marker);
    setCheckInComment('');
    setCheckInSuccess(false);
    setLocationCheckins([]);
    setLocationCheckinsError(null);
    setHasUserCheckedInAtLocation(false);
    setShowCheckInModal(true);
    void loadLocationCheckins(marker.place_id);
  };

  const handleToggleFavorite = useCallback(
    (placeId: string) => {
      if (!walletAddress) {
        toast.error('Please connect your wallet to save favorites');
        return;
      }

      const isFavorited = favoritePlaceIds?.has(placeId) ?? false;
      toggleFavorite({
        walletAddress,
        placeId,
        favorited: !isFavorited,
      });
    },
    [walletAddress, favoritePlaceIds, toggleFavorite]
  );

  const handleCloseCheckInModal = () => {
    const restoreTarget = shouldReopenMapCardAfterCheckInClose(
      Boolean(checkInTarget)
    )
      ? checkInTarget
      : null;
    const restoreSaveToListTip = shouldShowSaveToListTipAfterCheckIn({
      hasCheckInTarget: Boolean(checkInTarget),
      saveToListTipAlreadyShowing: showSaveToListTourTip,
      postTourFirstSearchPending: postTourFirstSearchTipRef.current,
    });

    setShowCheckInModal(false);
    setShowCheckInCommentModal(false);
    setCheckInComment('');
    setCheckInTarget(null);
    setCheckInSuccess(false);
    setCheckInPointsEarned(0);
    setCheckInTotalPoints(0);
    setLocationCheckins([]);
    setLocationCheckinsError(null);
    setIsLoadingLocationCheckins(false);
    setHasUserCheckedInAtLocation(false);

    // Return to the place's map card (after points screen, or after creating
    // a location then dismissing check-in) and restore the post-tour tip.
    if (restoreTarget) {
      setPendingMapCreateMarker(null);
      setPopupInfo(restoreTarget);
      setSelectedMarker(restoreTarget);
      if (restoreSaveToListTip) {
        setShowSaveToListTourTip(true);
        postTourFirstSearchTipRef.current = false;
      }
    }
  };

  const handleCheckIn = async () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to check in');
      return;
    }

    if (!checkInTarget) {
      toast.error('Select a location before checking in');
      return;
    }

    setIsCheckingIn(true);

    try {
      const response = await fetch('/api/location-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          email: user?.email?.address,
          username: userUsername,
          locationData: {
            place_id: checkInTarget.place_id,
            name: checkInTarget.name,
            address: checkInTarget.address ?? checkInTarget.name,
            lat: checkInTarget.latitude.toString(),
            lon: checkInTarget.longitude.toString(),
          },
          comment: checkInComment.trim() ? checkInComment.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info("You've already checked in at this location!");
          setHasUserCheckedInAtLocation(true);
          setPopupInfo(null);
          handleCloseCheckInModal();
          return;
        }
        throw new Error(result.error || 'Failed to check in');
      }

      const payload = result.data ?? result;

      // Show success screen
      setCheckInPointsEarned(
        payload.pointsEarned ??
          payload.checkin?.points_earned ??
          checkInTarget.points_value ??
          100
      );
      setCheckInTotalPoints(payload.player?.total_points ?? 0);
      setCheckInSuccess(true);
      setHasUserCheckedInAtLocation(true);
      setShowCheckInCommentModal(false);
      const trimmedComment = checkInComment.trim();
      if (trimmedComment.length > 0) {
        setLocationCheckins((prev) => [
          {
            id: payload.checkin?.id ?? Date.now(),
            comment: trimmedComment,
            imageUrl:
              payload.checkin?.image_url ?? checkInTarget.imageUrl ?? null,
            pointsEarned:
              payload.checkin?.points_earned ||
              payload.pointsEarned ||
              checkInTarget.points_value ||
              100,
            createdAt: payload.checkin?.created_at || new Date().toISOString(),
            username: userUsername,
            walletAddress: walletAddress || null,
          },
          ...prev,
        ]);
      }

      // Close the map popups
      setPopupInfo(null);
      setSelectedMarker(null);
      setPendingMapCreateMarker(null);
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in: ' + (error as Error).message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleBusinessDetailsNext = () => {
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    if (!formData.categoryId.trim()) {
      toast.error('Category is required');
      return;
    }

    // Go directly to creating the location (no check-in step)
    handleCreateLocation();
  };

  const handleCreateLocation = async () => {
    if (!selectedMarker || !walletAddress) {
      toast.error('Please select a location and connect your wallet');
      return;
    }

    // Best-effort duplicate check using local state (may be stale if another user created the location)
    // The backend is the source of truth and will return 409 if duplicate exists
    const existingMarker = findExistingMarker(selectedMarker.place_id);
    if (existingMarker) {
      toast.info('This location already exists—try checking in instead!');
      setSelectedMarker(existingMarker);
      setPopupInfo(existingMarker);
      setShowLocationForm(false);
      return;
    }

    setIsCreatingLocation(true);

    try {
      // Upload location image
      let locationImageUrl = '';
      let locationImageThumbUrl: string | null = null;

      if (formData.locationImage) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.locationImage);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorResult = await uploadResponse.json().catch(() => ({}));
          throw new Error(
            errorResult.error ||
              'Failed to upload location image. Please try again.'
          );
        }
        const uploadResponseData = await uploadResponse.json();
        // Unwrap the apiSuccess wrapper
        const uploadResult = uploadResponseData.data || uploadResponseData;
        locationImageUrl = uploadResult.imageUrl || uploadResult.url;
        locationImageThumbUrl = uploadResult.thumbnailUrl ?? null;
        if (!locationImageUrl) {
          throw new Error('Image upload succeeded but no URL was returned');
        }
      }

      // Create location and award points (optional verified email for analytics)
      let authHeaders: Record<string, string> = {};
      if (user?.email?.address) {
        try {
          authHeaders = await adminApiAuthHeaders(getAccessToken);
        } catch {
          // Proceed without Bearer — location still created; server skips verified email
        }
      }
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          place_id: selectedMarker.place_id,
          name: formData.name || selectedMarker.name, // Venue name
          address:
            formData.address || selectedMarker.address || selectedMarker.name, // Street address
          description: formData.description,
          lat: selectedMarker.latitude.toString(),
          lon: selectedMarker.longitude.toString(),
          categoryId: formData.categoryId,
          walletAddress: walletAddress,
          username: userUsername,
          locationImage: locationImageUrl,
          locationImageThumb: locationImageThumbUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(
            result.error ||
              'You can only add 300 locations per week. Come back next week!'
          );
          handleCloseLocationForm();
          return;
        }
        if (response.status === 409) {
          // Location already exists - fetch full location details and show it
          toast.info('This location already exists—try checking in instead!');

          // Helper function to handle showing existing location
          const showExistingLocation = (marker: MarkerData) => {
            // Add to markers if not already present
            setMarkers((current) => {
              const exists = current.some(
                (m) => m.place_id === marker.place_id
              );
              if (exists) return current;
              return [...current, marker];
            });

            setSelectedMarker(marker);
            setPopupInfo(marker);
            setShowLocationForm(false);
          };

          // Try to fetch full location details from API
          try {
            const locationsResponse = await fetch('/api/locations');
            if (locationsResponse.ok) {
              const locationsResponseData = await locationsResponse.json();
              // Unwrap the apiSuccess wrapper
              const locationsData =
                locationsResponseData.data || locationsResponseData;
              const existingLocation = (locationsData.locations || []).find(
                (loc: any) => loc.place_id === selectedMarker.place_id
              );

              if (existingLocation) {
                const existingMarker: MarkerData = {
                  latitude:
                    existingLocation.latitude ?? selectedMarker.latitude,
                  longitude:
                    existingLocation.longitude ?? selectedMarker.longitude,
                  place_id: existingLocation.place_id,
                  name: existingLocation.name,
                  address: existingLocation.address ?? existingLocation.name,
                  description: existingLocation.description ?? null,
                  creator_wallet_address:
                    existingLocation.creator_wallet_address ?? null,
                  creator_username: existingLocation.creator_username ?? null,
                  imageUrl: existingLocation.coin_image_url ?? null,
                  imageThumbUrl: existingLocation.coin_image_thumb_url ?? null,
                };
                showExistingLocation(existingMarker);
                setIsCreatingLocation(false);
                return;
              }
            }
          } catch (fetchError) {
            console.error('Failed to fetch existing location:', fetchError);
          }

          // Fallback: use the location from the error response if available
          if (result.location) {
            const existingMarker: MarkerData = {
              latitude: result.location.latitude ?? selectedMarker.latitude,
              longitude: result.location.longitude ?? selectedMarker.longitude,
              place_id: selectedMarker.place_id,
              name: result.location.name,
              address: result.location.address ?? result.location.name,
              description: result.location.description ?? null,
              creator_wallet_address:
                result.location.creator_wallet_address ?? null,
              creator_username: result.location.creator_username ?? null,
              imageUrl: result.location.coin_image_url ?? null,
              imageThumbUrl: result.location.coin_image_thumb_url ?? null,
            };
            showExistingLocation(existingMarker);
          } else {
            toast.error('Location already exists, but could not load details');
          }

          setIsCreatingLocation(false);
          return;
        }
        throw new Error(result.error || 'Failed to create location');
      }

      const payload = result.data ?? result;
      const creationPoints = payload.pointsAwarded ?? 100;
      const apiLocation = payload.location as
        | {
            latitude?: number;
            longitude?: number;
            place_id?: string;
            name?: string;
            address?: string | null;
            description?: string | null;
            creator_wallet_address?: string | null;
            creator_username?: string | null;
            coin_image_url?: string | null;
            coin_image_thumb_url?: string | null;
            category?: LocationCategory | null;
            points_value?: number | null;
            event_url?: string | null;
            is_visible?: boolean | null;
          }
        | undefined;

      const markerForCheckIn: MarkerData = apiLocation
        ? {
            latitude: Number(apiLocation.latitude ?? selectedMarker.latitude),
            longitude: Number(
              apiLocation.longitude ?? selectedMarker.longitude
            ),
            place_id: apiLocation.place_id ?? selectedMarker.place_id,
            name: apiLocation.name ?? selectedMarker.name,
            address:
              apiLocation.address ??
              selectedMarker.address ??
              apiLocation.name ??
              selectedMarker.name,
            description: apiLocation.description ?? formData.description,
            creator_wallet_address:
              apiLocation.creator_wallet_address ?? walletAddress ?? null,
            creator_username: apiLocation.creator_username ?? userUsername,
            imageUrl: apiLocation.coin_image_url ?? locationImageUrl ?? null,
            imageThumbUrl:
              apiLocation.coin_image_thumb_url ?? locationImageThumbUrl,
            category: apiLocation.category ?? null,
            points_value: apiLocation.points_value ?? 100,
            event_url: apiLocation.event_url ?? null,
          }
        : {
            ...selectedMarker,
            name: formData.name || selectedMarker.name,
            address:
              formData.address || selectedMarker.address || selectedMarker.name,
            description: formData.description,
            imageUrl: locationImageUrl,
            imageThumbUrl: locationImageThumbUrl,
          };

      setMarkers((current) => {
        if (current.some((m) => m.place_id === markerForCheckIn.place_id)) {
          return current;
        }
        return [...current, markerForCheckIn];
      });

      toast.success(
        `Location created! +${creationPoints} point${creationPoints === 1 ? '' : 's'}`
      );
      // Close the create drawer without wiping the place — keep it selected so
      // dismissing check-in still lands on the map card (+ post-tour list tip).
      setShowLocationForm(false);
      setFormStep('business-details');
      setPendingMapCreateMarker(null);
      setPointsEarned({ creation: 0, checkIn: 0 });
      setFormData({
        name: '',
        address: '',
        description: '',
        categoryId: '',
        locationImage: null,
        checkInComment: '',
      });
      setPopupInfo(markerForCheckIn);
      setSelectedMarker(markerForCheckIn);
      if (postTourFirstSearchTipRef.current) {
        setShowSaveToListTourTip(true);
      }
      remindLocationCreationFlow();
      handleStartCheckIn(markerForCheckIn);
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Failed to create location: ' + (error as Error).message);
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleCloseLocationForm = () => {
    setShowLocationForm(false);
    setFormStep('business-details');
    setSelectedMarker(null);
    setPopupInfo(null);
    setPendingMapCreateMarker(null);
    setPointsEarned({ creation: 0, checkIn: 0 });
    setFormData({
      name: '',
      address: '',
      description: '',
      categoryId: '',
      locationImage: null,
      checkInComment: '',
    });
  };

  const isCreateLocationFormComplete = Boolean(
    formData.name.trim() &&
    formData.description.trim() &&
    formData.categoryId.trim()
  );

  const handleCloseLocationFormRef = useRef(handleCloseLocationForm);
  handleCloseLocationFormRef.current = handleCloseLocationForm;

  useEffect(() => {
    if (!showLocationForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseLocationFormRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLocationForm]);

  const handleFocusLocationFromList = (location: DrawerLocationSummary) => {
    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      return;
    }

    setPendingMapCreateMarker(null);

    const lat = location.latitude;
    const lon = location.longitude;
    const targetZoom = Math.max(viewState.zoom ?? 12, 15);

    mapRef.current?.flyTo?.({
      center: [lon, lat],
      zoom: targetZoom,
      duration: 1200,
    });

    setViewState((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      zoom: targetZoom,
    }));

    // Update bounds after flyTo completes (1200ms duration + small buffer)
    setTimeout(() => {
      const bounds = calculateMapBounds({
        longitude: lon,
        latitude: lat,
        zoom: targetZoom,
      });
      if (bounds) {
        setMapBounds(bounds);
      }
    }, 1300);

    const matchedMarker = location.place_id
      ? markers.find((marker) => marker.place_id === location.place_id)
      : null;

    if (matchedMarker) {
      setPopupInfo(matchedMarker);
      setSelectedMarker(matchedMarker);
    } else {
      setPopupInfo({
        latitude: lat,
        longitude: lon,
        place_id:
          location.place_id ||
          (location.id !== undefined
            ? `list-${location.id}`
            : `list-${Date.now()}`),
        name: location.name,
        imageUrl: location.coin_image_url ?? null,
        imageThumbUrl: location.coin_image_thumb_url ?? null,
        creator_wallet_address: null,
        creator_username: null,
        category: location.category ?? null,
        event_url: location.event_url ?? null,
      });
    }
  };

  const isDrawerMinimized = Boolean(
    pendingMapCreateMarker || showLocationForm || showListCreateMapTip
  );
  const isMobileDrawerCollapsed = Boolean(
    pendingMapCreateMarker ||
    popupInfo ||
    showLocationForm ||
    showListCreateMapTip
  );
  const [isListDetailOpen, setIsListDetailOpen] = useState(false);
  const [mobileSheetLayout, setMobileSheetLayout] =
    useState<LocationListsSheetLayout>({
      size: 'peek',
      heightPx: 0,
    });

  const handleMobileSheetLayoutChange = useCallback(
    (layout: LocationListsSheetLayout) => {
      setMobileSheetLayout(layout);
    },
    []
  );

  const mobileLocateBottomPx =
    mobileSheetLayout.size === 'full' || mobileSheetLayout.heightPx <= 0
      ? 16
      : mobileSheetLayout.heightPx + 16;
  const showMobileLocateAboveSheet = mobileSheetLayout.size !== 'full';

  const mapCardBottomOverlayClassName = cn(
    'pointer-events-none fixed inset-x-0 flex justify-center px-4 xl:pl-[394px]',
    showListCreateMapTip || showSaveToListTourTip || showCreateListTourTip
      ? 'z-[90]'
      : 'z-[75]',
    isListDetailOpen
      ? 'mapWide:pl-[452px] mapHd:pl-[880px]'
      : 'mapWide:pl-[559px] mapHd:pl-[809px]',
    showLocationForm
      ? 'bottom-[calc(min(88vh,640px)+0.5rem)]'
      : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'
  );

  /** Map panel inset for desktop overlays (drawer width + 23px gap). */
  const desktopMapPanelInsetClassName = cn(
    'xl:right-0 xl:left-[417px]',
    isListDetailOpen
      ? 'mapWide:left-[475px] mapHd:left-[903px]'
      : 'mapWide:left-[582px] mapHd:left-[832px]'
  );

  const checkInModalShellClassName = cn(
    'fixed left-0 top-0 z-[80] flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 border-none bg-transparent p-0 shadow-none data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-none',
    'xl:bottom-0 xl:top-0 xl:flex xl:h-auto xl:w-auto xl:translate-x-0 xl:translate-y-0 xl:items-center xl:justify-center xl:p-0 xl:data-[state=closed]:zoom-out-100 xl:data-[state=open]:zoom-in-100',
    desktopMapPanelInsetClassName
  );

  const checkInModalOverlayClassName = cn(
    'xl:z-[80] xl:bg-black/25 xl:backdrop-blur-[2px]',
    desktopMapPanelInsetClassName
  );

  const checkInModalPanelClassName = cn(
    'flex min-h-0 w-full max-w-none flex-col overflow-hidden bg-white pt-0',
    checkInSuccess ? 'h-full pb-0' : 'h-full pb-2',
    'xl:mx-0 xl:flex xl:h-[954px] xl:max-h-[calc(100dvh-90px)] xl:w-[505px] xl:max-w-[505px] xl:shrink-0 xl:flex-col xl:items-center xl:justify-center'
  );

  const guideBackLink = effectiveGuideReturnHref ? (
    <Link
      href={effectiveGuideReturnHref}
      className="flex h-12 w-12 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[var(--Dark-Tint-20---Light-Steel,#DBDBDB)] bg-[var(--Dark-Tint-White,#FFF)] p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-90"
      aria-label="Back to guide"
    >
      <Image
        src="/arrow-left.svg"
        alt=""
        width={24}
        height={24}
        className="block shrink-0"
        unoptimized
      />
    </Link>
  ) : undefined;

  const searchProximity = {
    longitude: viewState.longitude,
    latitude: viewState.latitude,
  };

  return (
    <div className="fixed inset-0 h-full w-full xl:rounded-none">
      {/* Mobile / tablet nav */}
      <div className="absolute left-0 right-0 top-0 z-20 overflow-visible bg-gradient-to-b from-black/20 to-transparent xl:hidden">
        <div className="mx-auto flex min-w-0 w-full justify-center py-4">
          <MapNav
            leftSlot={guideBackLink}
            center={
              <MapSearchField
                proximity={searchProximity}
                onSelect={handleSearchSelect}
                showTourTip={showSearchTourTip}
                onDismissTip={dismissSearchTourTip}
                className="relative flex w-full min-w-0 max-w-[163px] items-center md:hidden"
                searchClassName="w-full min-w-0"
                tipClassName="absolute left-1/2 top-full z-40 mt-2.5 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2"
              />
            }
          />
        </div>
      </div>

      {/* Desktop nav (xl+) */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 hidden xl:block">
        <MapDesktopNav
          leftSlot={guideBackLink}
          searchSlot={
            <MapSearchField
              proximity={searchProximity}
              onSelect={handleSearchSelect}
              showTourTip={showSearchTourTip}
              onDismissTip={dismissSearchTourTip}
              className="pointer-events-auto relative flex h-16 w-[255px] items-center gap-4 px-2 py-[var(--sds-size-space-300)]"
              searchClassName="h-full min-w-0 flex-1"
              tipClassName="absolute left-2 right-2 top-full z-40 mt-2.5"
            />
          }
        />
      </div>

      {/* Desktop left drawer: 394 (≤1366) · 559 lists / 452 detail (1367–2559) · 809 lists / 880 detail (2560×1440+, 4 cards) */}
      <aside
        className={cn(
          'pointer-events-none absolute left-0 top-0 z-20 hidden w-[394px] flex-col items-stretch gap-[var(--sds-size-space-800)] bg-[var(--Backgrounds-Light-Screen,rgba(255,255,255,0.65))] px-4 shadow-[0_-4px_16px_0_rgba(0,0,0,0.12)] backdrop-blur-[32px] transition-[height,padding,width] duration-300 xl:flex',
          isDrawerMinimized
            ? cn(
                'h-auto pb-4 pt-[90px]',
                isListDetailOpen
                  ? 'mapWide:w-[452px] mapHd:w-[880px]'
                  : 'mapWide:w-[559px] mapHd:w-[809px]'
              )
            : cn(
                'h-[766px] max-h-[100dvh] pb-[95px] pt-[90px] mapWide:h-[1081px]',
                isListDetailOpen
                  ? 'mapWide:w-[452px] mapHd:w-[880px]'
                  : 'mapWide:w-[559px] mapHd:w-[809px]'
              )
        )}
      >
        <LocationListsDrawer
          onLocationFocus={handleFocusLocationFromList}
          fetchEnabled={discoverListsEnabled}
          collapseForMapCard={isDrawerMinimized}
          layout="sidebar"
          onListDetailChange={setIsListDetailOpen}
          onListDetailLocationsChange={setListFocusLocations}
          walletAddress={walletAddress}
          favoritePlaceIds={favoritePlaceIds}
          onToggleFavorite={handleToggleFavorite}
          isFavoritePending={isFavoritePending}
          initialCustomListId={initialCustomListId}
          focusCustomListId={focusCustomListId}
          initialPublicProfileListId={initialPublicProfileListId}
          initialCuratedListId={initialCuratedListId}
          viewerUsername={userUsername}
          viewerName={userProfileSummary?.name}
          viewerProfilePictureUrl={userProfileSummary?.profilePictureUrl}
          viewerTwitterHandle={userProfileSummary?.twitterHandle}
        />
      </aside>

      {showLocationForm && (
        <button
          type="button"
          onClick={handleCloseLocationForm}
          disabled={isCreatingLocation}
          className="pointer-events-auto absolute z-[85] flex h-10 w-10 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[#DBDBDB] bg-[var(--Backgrounds-Background,#FFF)] p-2 disabled:pointer-events-none disabled:opacity-50"
          style={{
            left: 'max(8px, env(safe-area-inset-left, 0px))',
            top: 'calc(env(safe-area-inset-top, 0px) + 5.5rem + 8px)',
          }}
          aria-label="Close create location form"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
            aria-hidden
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="#171717"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Mobile: locate control (lower right) — sits above drawer when peek/collapsed */}
      {showMobileLocateAboveSheet ? (
        <div
          className="pointer-events-none absolute right-4 z-[25] md:hidden transition-[bottom] duration-300"
          style={{ bottom: mobileLocateBottomPx }}
        >
          <MapLocateButton
            isLocating={isLocating}
            onLocate={handleLocateUser}
          />
        </div>
      ) : null}

      {/* Search row (tablet only) */}
      <div className="absolute left-1/2 top-20 z-30 w-full max-w-md -translate-x-1/2 transform px-4 xl:hidden">
        <div className="space-y-3">
          <div className="hidden items-center gap-2 md:flex">
            <MapSearchField
              proximity={searchProximity}
              onSelect={handleSearchSelect}
              showTourTip={showSearchTourTip}
              onDismissTip={dismissSearchTourTip}
              className="relative flex-1"
            />
            <MapLocateButton
              isLocating={isLocating}
              onLocate={handleLocateUser}
            />
          </div>
        </div>
      </div>

      <MapWelcomeTour
        open={showWelcomeBanner}
        onComplete={handleWelcomeTourComplete}
      />

      {walletAddress ? (
        <PlayerLocationPrompt
          open={showLocationPrompt}
          walletAddress={walletAddress}
          onComplete={handleLocationPromptComplete}
        />
      ) : null}

      <div className="xl:hidden">
        <LocationListsDrawer
          onLocationFocus={handleFocusLocationFromList}
          fetchEnabled={discoverListsEnabled}
          collapseForMapCard={isMobileDrawerCollapsed}
          onSheetLayoutChange={handleMobileSheetLayoutChange}
          onListDetailLocationsChange={setListFocusLocations}
          walletAddress={walletAddress}
          favoritePlaceIds={favoritePlaceIds}
          onToggleFavorite={handleToggleFavorite}
          isFavoritePending={isFavoritePending}
          initialCustomListId={initialCustomListId}
          focusCustomListId={focusCustomListId}
          initialPublicProfileListId={initialPublicProfileListId}
          initialCuratedListId={initialCuratedListId}
          viewerUsername={userUsername}
          viewerName={userProfileSummary?.name}
          viewerProfilePictureUrl={userProfileSummary?.profilePictureUrl}
          viewerTwitterHandle={userProfileSummary?.twitterHandle}
        />
      </div>

      {/* Desktop: locate control (lower right) */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden xl:block">
        <MapLocateButton isLocating={isLocating} onLocate={handleLocateUser} />
      </div>

      {/* Map — inset on desktop so drawer does not cover controls */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => {
          setViewState(evt.viewState);
          // Also update bounds during move for immediate feedback
          // This ensures bounds update even if onMoveEnd doesn't fire
          const bounds = calculateMapBounds(evt.viewState);
          if (bounds) {
            setMapBounds(bounds);
          }
        }}
        onMoveEnd={() => {
          // Update map bounds when map movement ends - this ensures accurate bounds
          // This is the most accurate as it uses the actual map instance
          if (process.env.NODE_ENV === 'development') {
            console.log('[MapBounds] onMoveEnd triggered');
          }
          const bounds = calculateMapBounds();
          if (bounds) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[MapBounds] Setting bounds from onMoveEnd:', bounds);
            }
            setMapBounds(bounds);
          }
        }}
        onLoad={() => {
          setMapRenderError(null);
          setTimeout(() => {
            const bounds = calculateMapBounds();
            if (bounds) {
              setMapBounds(bounds);
            }
            setDiscoverListsEnabled(true);
          }, 500);
        }}
        onError={(evt) => {
          const raw =
            evt && typeof evt === 'object' && 'error' in evt
              ? (evt as { error?: unknown }).error
              : evt;
          const msg =
            raw instanceof Error
              ? raw.message
              : typeof raw === 'string'
                ? raw
                : 'Unable to load the map.';
          if (msg.toLowerCase().includes('webgl')) {
            setMapRenderError(
              'This map requires WebGL. Enable hardware acceleration in your browser settings, update your graphics drivers, or try a different browser.'
            );
          } else {
            setMapRenderError(msg);
          }
        }}
        onClick={onMapClick}
        mapStyle="mapbox://styles/cdammr/cmnosp61u002u01sv5o4x8sop"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ position: 'absolute', inset: 0 }}
        cursor="crosshair"
      >
        <MapMarkersLayer
          visibleMarkers={visibleMarkers}
          selectedMarker={selectedMarker}
          pendingMapCreateMarker={
            pendingMapCreateMarker && !popupInfo ? pendingMapCreateMarker : null
          }
          userLocation={userLocation}
          onMarkerClick={handleMarkerClick}
        />
      </Map>

      <MapErrorOverlay mapRenderError={mapRenderError} />

      {popupInfo && !addToListTarget && (
        <div className={mapCardBottomOverlayClassName}>
          <div className="pointer-events-auto relative w-full max-w-[361px]">
            <MapCard
              name={popupInfo.name}
              address={popupInfo.address || popupInfo.name}
              description={popupInfo.description}
              category={popupInfo.category}
              isExisting={true}
              onAction={() => handleStartCheckIn(popupInfo)}
              onClose={() => {
                dismissListCreateMapTip();
                handleDismissSaveToListTourTip();
                setPopupInfo(null);
                setSelectedMarker(null);
              }}
              isLoading={isCheckingIn}
              imageUrl={popupInfo.imageUrl}
              placeId={popupInfo.place_id}
              eventUrl={popupInfo.event_url}
              onSaveToList={
                walletAddress
                  ? () => {
                      if (showSaveToListTourTip) {
                        setShowCreateListTourTip(true);
                      }
                      postTourFirstSearchTipRef.current = false;
                      handleDismissSaveToListTourTip();
                      setAddToListTarget(popupInfo);
                    }
                  : undefined
              }
              saveToListTip={
                showSaveToListTourTip && !showListCreateMapTip ? (
                  <MapYellowTip
                    className="absolute bottom-full left-0 right-0 z-30 mb-2.5"
                    pointer="bottom"
                    onDismiss={handleDismissSaveToListTourTip}
                  >
                    Start your first list
                  </MapYellowTip>
                ) : null
              }
              savedListCount={popupSavedListCount}
            />
            {showListCreateMapTip ? (
              <MapYellowTip
                className="absolute inset-x-3 top-12 z-30 sm:inset-x-4"
                onDismiss={dismissListCreateMapTip}
              >
                You&apos;re in!{' '}
                <Link
                  href="/dashboard"
                  className="underline underline-offset-2"
                  onClick={() => dismissListCreateMapTip()}
                >
                  Go to your profile
                </Link>{' '}
                to view your lists
              </MapYellowTip>
            ) : null}
          </div>
        </div>
      )}

      {addToListTarget && walletAddress && (
        <div
          className={cn(
            mapCardBottomOverlayClassName,
            // Full-bleed sheet on mobile; centered 393px card from sm up.
            'bottom-0 px-0 sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4'
          )}
        >
          <div className="pointer-events-auto w-full sm:max-w-[393px]">
            <AddToListDrawer
              location={{
                placeId: addToListTarget.place_id,
                name: addToListTarget.name,
                category: addToListTarget.category,
                imageUrl:
                  addToListTarget.imageThumbUrl || addToListTarget.imageUrl,
              }}
              walletAddress={walletAddress}
              onClose={() => {
                dismissCreateListTourTip();
                setAddToListTarget(null);
              }}
              onListCreated={handleListCreated}
              createListTip={
                showCreateListTourTip ? (
                  <MapYellowTip
                    className="absolute bottom-full right-0 z-40 mb-2.5 w-[min(20rem,calc(100vw-2rem))]"
                    pointer="bottom"
                    pointerAlign="end"
                    onDismiss={dismissCreateListTourTip}
                  >
                    Group your favorite spots into something you can share with
                    friends
                  </MapYellowTip>
                ) : null
              }
            />
          </div>
        </div>
      )}

      {pendingMapCreateMarker && !popupInfo && (
        <div className={mapCardBottomOverlayClassName}>
          <div className="pointer-events-auto w-full max-w-[361px]">
            <MapCard
              variant="createPreview"
              name={pendingMapCreateMarker.name}
              address={
                pendingMapCreateMarker.address || pendingMapCreateMarker.name
              }
              onAction={handleOpenCreateFromPendingMapClick}
              onClose={() => {
                setPendingMapCreateMarker(null);
                setSelectedMarker(null);
              }}
              isLoading={false}
            />
          </div>
        </div>
      )}

      <LocationCheckInDialog
        open={showCheckInModal}
        onClose={handleCloseCheckInModal}
        overlayClassName={checkInModalOverlayClassName}
        shellClassName={checkInModalShellClassName}
        panelClassName={checkInModalPanelClassName}
        checkInSuccess={checkInSuccess}
        checkInTarget={checkInTarget}
        isCheckingIn={isCheckingIn}
        favoritePlaceIds={favoritePlaceIds}
        onToggleFavorite={handleToggleFavorite}
        isFavoritePending={isFavoritePending}
        locationCheckins={locationCheckins}
        isLoadingLocationCheckins={isLoadingLocationCheckins}
        locationCheckinsError={locationCheckinsError}
        hasUserCheckedInAtLocation={hasUserCheckedInAtLocation}
        checkInPointsEarned={checkInPointsEarned}
        checkInTotalPoints={checkInTotalPoints}
        onOpenCommentModal={() => setShowCheckInCommentModal(true)}
      />

      <CheckInCommentDialog
        open={showCheckInCommentModal}
        comment={checkInComment}
        isCheckingIn={isCheckingIn}
        onCommentChange={setCheckInComment}
        onSubmit={handleCheckIn}
        onOpenChange={(open) => {
          if (!open) setShowCheckInCommentModal(false);
        }}
        overlayClassName={checkInModalOverlayClassName}
        shellClassName={checkInModalShellClassName}
        panelClassName={checkInModalPanelClassName}
      />

      {showLocationForm && (
        <MapCreateLocationDrawer
          formStep={formStep}
          formData={formData}
          categories={categories}
          isCreatingLocation={isCreatingLocation}
          isFormComplete={isCreateLocationFormComplete}
          creationPoints={pointsEarned.creation}
          locationName={formData.name || selectedMarker?.name || 'Location'}
          onClose={handleCloseLocationForm}
          onNext={handleBusinessDetailsNext}
          setFormData={setFormData}
        />
      )}
    </div>
  );
}
