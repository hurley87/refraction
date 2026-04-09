'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Map, { Marker } from 'react-map-gl/mapbox';
import LocationSearch from '@/components/shared/location-search';
import {
  deriveDisplayNameAndAddress,
  MapboxGeocodeFeature,
  mergePoiAndAddressReverseGeocode,
  mergeSearchBoxReverseFeatures,
} from '@/lib/utils/location-autofill';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import MapNav from '@/components/map/mapnav';
import MapCard from '@/components/map/map-card';
import LocationListsDrawer, {
  DrawerLocationSummary,
} from '@/components/location-lists-drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
  type?: string;
  event_url?: string | null;
  points_value?: number | null;
}

interface LocationCheckinPreview {
  id: number;
  comment: string;
  imageUrl?: string | null;
  pointsEarned: number;
  createdAt?: string | null;
  username?: string | null;
  walletAddress?: string | null;
  profilePictureUrl?: string | null;
}

interface LocationFormData {
  name: string;
  address: string;
  description: string;
  locationImage: File | null;
  checkInComment: string;
}

type FormStep = 'business-details' | 'success';

interface SearchLocationData {
  latitude: number;
  longitude: number;
  place_id: string;
  name: string;
  placeFormatted?: string;
}

const WELCOME_BANNER_STORAGE_KEY = 'irl-map-welcome-dismissed';
const WELCOME_BANNER_MAX_SHOWS = 3;
const LOCATION_INSTRUCTION_STORAGE_KEY =
  'irl-location-create-instruction-count';
const LOCATION_INSTRUCTION_LIMIT = 3;

/** Style/Body/Body Medium — map LocationSearch (Gal Gothic) */
const MAP_SEARCH_INPUT_CLASS =
  'text-center text-base font-medium leading-[22px] tracking-[-0.48px] font-["Gal_Gothic_Variable",sans-serif] text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)] placeholder:text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)]';

const getWelcomeBannerStorageKey = (wallet?: string | null) =>
  wallet
    ? `${WELCOME_BANNER_STORAGE_KEY}:${wallet}`
    : WELCOME_BANNER_STORAGE_KEY;

function getCheckinDisplayName(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username;
  }
  if (entry.walletAddress && entry.walletAddress.length > 8) {
    return `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
  }
  return 'Explorer';
}

function getCheckinInitial(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username.trim().charAt(0).toUpperCase();
  }
  if (entry.walletAddress && entry.walletAddress.length > 2) {
    return entry.walletAddress.slice(2, 3).toUpperCase();
  }
  return '+';
}

function formatLocationCategory(type?: string | null) {
  const normalized = (type ?? 'location').trim();
  if (!normalized) return 'Location';
  return normalized
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface InteractiveMapProps {
  initialPlaceId?: string | null;
  initialLatitude?: number;
  initialLongitude?: number;
}

export default function InteractiveMap({
  initialPlaceId,
  initialLatitude,
  initialLongitude,
}: InteractiveMapProps) {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [userUsername, setUserUsername] = useState<string | null>(null);

  const [viewState, setViewState] = useState({
    longitude: initialLongitude ?? -73.9442,
    latitude: initialLatitude ?? 40.7081,
    zoom: initialLatitude != null && initialLongitude != null ? 12 : 8,
  });

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('business-details');
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState({ creation: 0, checkIn: 0 });
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    description: '',
    locationImage: null,
    checkInComment: '',
  });
  const [searchedLocation, setSearchedLocation] =
    useState<SearchLocationData | null>(null);
  /** Reverse-geocoded spot from map click — not yet an IRL location; show compact card before create form. */
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
  const [locationCheckins, setLocationCheckins] = useState<
    LocationCheckinPreview[]
  >([]);
  const [isLoadingLocationCheckins, setIsLoadingLocationCheckins] =
    useState(false);
  const [locationCheckinsError, setLocationCheckinsError] = useState<
    string | null
  >(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Don't initialize bounds - wait for map to load and provide actual viewport bounds
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const mapRef = useRef<any>(null);
  const hasSetInitialLocationRef = useRef(false);
  const walletAddressRef = useRef<string | null | undefined>(walletAddress);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [welcomeBannerViews, setWelcomeBannerViews] = useState(0);
  const [, setLocationInstructionShows] = useState(0);

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
        console.warn('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [initialLatitude, initialLongitude]);

  // Keep wallet address ref in sync
  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  // Fetch user's username from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (walletAddress) {
        try {
          const response = await fetch(
            `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`
          );
          if (response.ok) {
            const responseData = await response.json();
            // Unwrap the apiSuccess wrapper
            const result = responseData.data || responseData;
            if (result.player?.username) {
              setUserUsername(result.player.username);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    fetchUserData();
  }, [walletAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check wallet-specific key first (if wallet is connected)
    const welcomeKey = getWelcomeBannerStorageKey(walletAddress);
    const storedViews = window.localStorage.getItem(welcomeKey);
    let parsedViews = storedViews ? parseInt(storedViews, 10) : 0;

    // If wallet is connected but no wallet-specific key exists, check the non-wallet key
    // and migrate it to preserve the view count
    if (walletAddress && (!storedViews || Number.isNaN(parsedViews))) {
      const nonWalletKey = getWelcomeBannerStorageKey(null);
      const nonWalletViews = window.localStorage.getItem(nonWalletKey);
      const parsedNonWalletViews = nonWalletViews
        ? parseInt(nonWalletViews, 10)
        : 0;

      if (!Number.isNaN(parsedNonWalletViews) && parsedNonWalletViews > 0) {
        // Migrate the view count to the wallet-specific key
        parsedViews = parsedNonWalletViews;
        window.localStorage.setItem(welcomeKey, String(parsedViews));
        // Optionally remove the old key to avoid confusion
        window.localStorage.removeItem(nonWalletKey);
      }
    }

    if (!Number.isNaN(parsedViews)) {
      setWelcomeBannerViews(parsedViews);
      setShowWelcomeBanner(parsedViews < WELCOME_BANNER_MAX_SHOWS);
    } else {
      setWelcomeBannerViews(0);
      setShowWelcomeBanner(true);
    }

    const storedInstructionCount = window.localStorage.getItem(
      LOCATION_INSTRUCTION_STORAGE_KEY
    );
    if (storedInstructionCount) {
      const parsed = parseInt(storedInstructionCount, 10);
      if (!Number.isNaN(parsed)) {
        setLocationInstructionShows(parsed);
      }
    }
  }, [walletAddress]);

  const dismissWelcomeBanner = () => {
    if (typeof window !== 'undefined') {
      setWelcomeBannerViews((prev) => {
        const next = Math.min(prev + 1, WELCOME_BANNER_MAX_SHOWS);
        // Use ref to get current wallet address to avoid stale closure
        const currentWalletAddress = walletAddressRef.current;
        window.localStorage.setItem(
          getWelcomeBannerStorageKey(currentWalletAddress),
          String(next)
        );
        return next;
      });
    }
    setShowWelcomeBanner(false);
  };

  const remindLocationCreationFlow = () => {
    setLocationInstructionShows((prev) => {
      if (prev >= LOCATION_INSTRUCTION_LIMIT) {
        return prev;
      }
      const next = prev + 1;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LOCATION_INSTRUCTION_STORAGE_KEY,
          String(next)
        );
        // Use ref to get current wallet address to avoid stale closure
        const currentWalletAddress = walletAddressRef.current;
        const welcomeKey = getWelcomeBannerStorageKey(currentWalletAddress);
        const storedViews = window.localStorage.getItem(welcomeKey);
        const parsed = storedViews ? parseInt(storedViews, 10) : 0;
        if (Number.isNaN(parsed) || parsed < WELCOME_BANNER_MAX_SHOWS) {
          setShowWelcomeBanner(true);
        }
      }
      return next;
    });
  };

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
            type: loc.type ?? 'location',
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
              console.log(
                '[MapBounds] Calculated from map instance:',
                calculatedBounds
              );
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
              console.log(
                '[MapBounds] Calculated from ref.getBounds():',
                calculatedBounds
              );
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
      console.log('[MapBounds] Calculated fallback from viewState:', {
        center: { latitude, longitude },
        zoom,
        bounds: fallbackBounds,
      });
      return fallbackBounds;
    },
    [viewState]
  );

  // Handle deep link to specific location via placeId URL param
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (!initialPlaceId || markers.length === 0 || deepLinkHandledRef.current)
      return;

    const targetMarker = markers.find((m) => m.place_id === initialPlaceId);
    if (targetMarker) {
      deepLinkHandledRef.current = true;
      const targetZoom = Math.max(viewState.zoom ?? 12, 15);
      // Center map on location
      setViewState((prev) => ({
        ...prev,
        latitude: targetMarker.latitude,
        longitude: targetMarker.longitude,
        zoom: targetZoom,
      }));
      // Update bounds after view changes
      setTimeout(() => {
        const bounds = calculateMapBounds({
          longitude: targetMarker.longitude,
          latitude: targetMarker.latitude,
          zoom: targetZoom,
        });
        if (bounds) {
          setMapBounds(bounds);
        }
      }, 300);
      // Open check-in modal
      setCheckInTarget(targetMarker);
      setCheckInComment('');
      setCheckInSuccess(false);
      setLocationCheckins([]);
      setLocationCheckinsError(null);
      setShowCheckInModal(true);
      void loadLocationCheckins(targetMarker.place_id);
    }
  }, [initialPlaceId, markers, viewState.zoom, calculateMapBounds]);

  const loadLocationCheckins = async (placeId: string) => {
    if (!placeId) return;
    setIsLoadingLocationCheckins(true);
    setLocationCheckinsError(null);
    try {
      const response = await fetch(
        `/api/location-comments?placeId=${encodeURIComponent(placeId)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const responseData = await response.json();
      // Unwrap the apiSuccess wrapper
      const data = responseData.data || responseData;
      setLocationCheckins(data.checkins || []);
    } catch (error) {
      console.error('Failed to load location check-ins:', error);
      setLocationCheckins([]);
      setLocationCheckinsError('Unable to load check-ins right now.');
    } finally {
      setIsLoadingLocationCheckins(false);
    }
  };

  const findExistingMarker = (placeId?: string | null) => {
    if (!placeId) return null;
    return markers.find((marker) => marker.place_id === placeId) ?? null;
  };

  // Add markers by clicking the map
  const onMapClick = async (event: any) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to create locations');
      return;
    }

    // Clear searched location when clicking on the map
    setSearchedLocation(null);
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
        setSearchedLocation(null);
        setPendingMapCreateMarker(null);
        return;
      }

      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.name, // Venue name
        address: newMarker.address || newMarker.name, // Address
        description: '',
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
    setPendingMapCreateMarker(null);
    const { longitude, latitude, id, name, placeFormatted, featureType } =
      picked;
    const newViewState = { longitude, latitude, zoom: 15 };
    setViewState(newViewState);

    console.log('[MapBounds] Search selected:', { longitude, latitude, name });
    // Update bounds immediately using the new viewState, then again after map settles
    // First update uses the new coordinates for fallback calculation
    const immediateBounds = calculateMapBounds(newViewState);
    if (immediateBounds) {
      console.log(
        '[MapBounds] Setting immediate bounds after search:',
        immediateBounds
      );
      setMapBounds(immediateBounds);
    }

    // Update again after map has fully moved to get accurate bounds from map instance
    setTimeout(() => {
      console.log('[MapBounds] Recalculating bounds after search delay');
      const bounds = calculateMapBounds();
      if (bounds) {
        console.log('[MapBounds] Setting final bounds after search:', bounds);
        setMapBounds(bounds);
      }
    }, 500);

    // Open nearest existing marker if within 100m
    const toRad = (v: number) => (v * Math.PI) / 180;
    const earth = 6371000; // m
    const distanceMeters = (
      aLat: number,
      aLon: number,
      bLat: number,
      bLon: number
    ) => {
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const A =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) *
          Math.cos(toRad(bLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
      return earth * c;
    };

    let nearest: MarkerData | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const m of markers) {
      const d = distanceMeters(latitude, longitude, m.latitude, m.longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = m;
      }
    }
    if (nearest && nearestDist <= 100) {
      setSelectedMarker(nearest);
      setPopupInfo(nearest);
      setSearchedLocation(null); // Clear searched location if marker found
    } else {
      // Create a temporary location from search
      const { displayName, address } = deriveDisplayNameAndAddress({
        name,
        placeFormatted,
        featureType,
      });
      const searchLocation: SearchLocationData = {
        latitude,
        longitude,
        place_id: id,
        name: displayName || address || 'Unknown Location',
        placeFormatted: placeFormatted,
      };
      setSearchedLocation(searchLocation);
      setSelectedMarker(null);
      setPopupInfo(null);
    }
  };

  const handleMarkerClick = (marker: MarkerData) => {
    setPopupInfo(marker);
    setSelectedMarker(marker);
    setSearchedLocation(null); // Clear searched location when clicking a marker
    setPendingMapCreateMarker(null);
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
        console.warn('Geolocation error:', error);
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
    setShowCheckInModal(true);
    void loadLocationCheckins(marker.place_id);
  };

  const handleCloseCheckInModal = () => {
    setShowCheckInModal(false);
    setShowCheckInCommentModal(false);
    setCheckInComment('');
    setCheckInTarget(null);
    setCheckInSuccess(false);
    setCheckInPointsEarned(0);
    setLocationCheckins([]);
    setLocationCheckinsError(null);
    setIsLoadingLocationCheckins(false);
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
            lat: checkInTarget.latitude.toString(),
            lon: checkInTarget.longitude.toString(),
            type: 'location',
          },
          comment: checkInComment.trim() ? checkInComment.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info("You've already checked in at this location!");
          setPopupInfo(null);
          setSearchedLocation(null);
          handleCloseCheckInModal();
          return;
        }
        throw new Error(result.error || 'Failed to check in');
      }

      // Show success screen
      setCheckInPointsEarned(result.pointsEarned || 100);
      setCheckInSuccess(true);
      setShowCheckInCommentModal(false);
      const trimmedComment = checkInComment.trim();
      if (trimmedComment.length > 0) {
        setLocationCheckins((prev) => [
          {
            id: result.checkin?.id ?? Date.now(),
            comment: trimmedComment,
            imageUrl:
              result.checkin?.image_url ?? checkInTarget.imageUrl ?? null,
            pointsEarned:
              result.checkin?.points_earned || result.pointsEarned || 100,
            createdAt: result.checkin?.created_at || new Date().toISOString(),
            username: userUsername,
            walletAddress: walletAddress || null,
          },
          ...prev,
        ]);
      }

      // Close the map popups
      setPopupInfo(null);
      setSearchedLocation(null);
      setSelectedMarker(null);
      setPendingMapCreateMarker(null);
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in: ' + (error as Error).message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleInitiateLocationCreation = async () => {
    if (!searchedLocation) return;

    const existingMarker = findExistingMarker(searchedLocation.place_id);
    if (existingMarker) {
      toast.info('That location already exists—check it out instead!');
      setSelectedMarker(existingMarker);
      setPopupInfo(existingMarker);
      setShowLocationForm(false);
      setSearchedLocation(null);
      setPendingMapCreateMarker(null);
      return;
    }

    // Set up for creating the location
    const newMarker: MarkerData = {
      latitude: searchedLocation.latitude,
      longitude: searchedLocation.longitude,
      place_id: searchedLocation.place_id,
      name: searchedLocation.name,
    };

    setSelectedMarker(newMarker);
    setFormData({
      name: searchedLocation.name, // Venue name
      address: searchedLocation.placeFormatted || searchedLocation.name, // Address
      description: '',
      locationImage: null,
      checkInComment: '',
    });
    setFormStep('business-details');
    setShowLocationForm(true);
  };

  const handleBusinessDetailsNext = () => {
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    if (!formData.locationImage) {
      toast.error('Location image is required');
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
      setSearchedLocation(null);
      return;
    }

    setIsCreatingLocation(true);

    try {
      // Upload location image
      let locationImageUrl = '';

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
        if (!locationImageUrl) {
          throw new Error('Image upload succeeded but no URL was returned');
        }
      }

      // Create location and award points
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: selectedMarker.place_id,
          name: formData.name || selectedMarker.name, // Venue name
          address:
            formData.address || selectedMarker.address || selectedMarker.name, // Street address
          description: formData.description,
          lat: selectedMarker.latitude.toString(),
          lon: selectedMarker.longitude.toString(),
          type: 'location',
          walletAddress: walletAddress,
          username: userUsername,
          locationImage: locationImageUrl,
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
            setSearchedLocation(null);
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

      // Location created successfully - it will appear on the map after admin approval
      // Do NOT add to local markers state - location is hidden until admin approves

      const creationPoints = result.pointsAwarded || 100;

      // Store points and show success screen
      setPointsEarned({ creation: creationPoints, checkIn: 0 });
      setFormStep('success');
      remindLocationCreationFlow();
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
      locationImage: null,
      checkInComment: '',
    });
  };

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
        creator_wallet_address: null,
        creator_username: null,
        type: location.type ?? 'location',
        event_url: location.event_url ?? null,
      });
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* MapNav Header (mobile: search sits between logo and menu) */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/20 to-transparent">
        <div className="mx-auto flex w-full justify-center py-4">
          <MapNav
            center={
              <div className="flex w-[163px] max-w-[min(163px,100%)] min-w-0 shrink-0 items-center md:hidden">
                <LocationSearch
                  placeholder="Search"
                  proximity={{
                    longitude: viewState.longitude,
                    latitude: viewState.latitude,
                  }}
                  onSelect={handleSearchSelect}
                  className="w-full min-w-0"
                  inputClassName={MAP_SEARCH_INPUT_CLASS}
                />
              </div>
            }
          />
        </div>
      </div>

      {/* Mobile: locate control (lower right) */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 md:hidden">
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={isLocating}
          className="pointer-events-auto flex h-[55px] w-[55px] shrink-0 items-center justify-center gap-4 rounded-[1000px] border border-[var(--IRL-Yellow,#FFF200)] bg-[var(--IRL-Yellow,#FFF200)] px-3 py-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isLocating ? 'Locating...' : 'My Location'}
        >
          {isLocating ? (
            <svg
              className="size-6 shrink-0 animate-spin text-[#171717]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              className="aspect-square size-6 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M5.82333 16.099L3 18.9316L5.06064 21L7.87035 18.1797L9.87107 20.1196V14.1031H3.8771L5.82333 16.099Z"
                fill="#171717"
              />
              <path
                d="M11.9999 10.2014C11.0288 10.2014 10.2402 10.9916 10.2402 11.9677C10.2402 12.9438 11.0275 13.734 11.9999 13.734C12.9723 13.734 13.7595 12.9438 13.7595 11.9677C13.7595 10.9916 12.9723 10.2014 11.9999 10.2014Z"
                fill="#171717"
              />
              <path
                d="M16.1177 18.1661L18.9397 21L21.0004 18.9316L18.1906 16.1113L20.1233 14.1031H14.1279V20.1196L16.1177 18.1661Z"
                fill="#171717"
              />
              <path
                d="M18.1766 7.83501L21 5.00242L18.9393 2.93402L16.1296 5.75431L14.1289 3.81442V9.83095H20.1229L18.1766 7.83501Z"
                fill="#171717"
              />
              <path
                d="M7.88261 5.76798L5.06064 2.93402L3 5.00242L5.80971 7.82271L3.8771 9.83095H9.87107V3.81442L7.88261 5.76798Z"
                fill="#171717"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Search row (desktop/tablet) + welcome banner (all breakpoints) */}
      <div className="absolute left-1/2 top-20 z-10 w-full max-w-md -translate-x-1/2 transform px-4">
        <div className="space-y-3">
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex-1">
              <LocationSearch
                placeholder="Search"
                proximity={{
                  longitude: viewState.longitude,
                  latitude: viewState.latitude,
                }}
                onSelect={handleSearchSelect}
                inputClassName={MAP_SEARCH_INPUT_CLASS}
              />
            </div>
            <button
              type="button"
              onClick={handleLocateUser}
              disabled={isLocating}
              className="flex h-[55px] w-[55px] shrink-0 items-center justify-center gap-4 rounded-[1000px] border border-[var(--IRL-Yellow,#FFF200)] bg-[var(--IRL-Yellow,#FFF200)] px-3 py-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={isLocating ? 'Locating...' : 'My Location'}
            >
              {isLocating ? (
                <svg
                  className="size-6 shrink-0 animate-spin text-[#171717]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  className="aspect-square size-6 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M5.82333 16.099L3 18.9316L5.06064 21L7.87035 18.1797L9.87107 20.1196V14.1031H3.8771L5.82333 16.099Z"
                    fill="#171717"
                  />
                  <path
                    d="M11.9999 10.2014C11.0288 10.2014 10.2402 10.9916 10.2402 11.9677C10.2402 12.9438 11.0275 13.734 11.9999 13.734C12.9723 13.734 13.7595 12.9438 13.7595 11.9677C13.7595 10.9916 12.9723 10.2014 11.9999 10.2014Z"
                    fill="#171717"
                  />
                  <path
                    d="M16.1177 18.1661L18.9397 21L21.0004 18.9316L18.1906 16.1113L20.1233 14.1031H14.1279V20.1196L16.1177 18.1661Z"
                    fill="#171717"
                  />
                  <path
                    d="M18.1766 7.83501L21 5.00242L18.9393 2.93402L16.1296 5.75431L14.1289 3.81442V9.83095H20.1229L18.1766 7.83501Z"
                    fill="#171717"
                  />
                  <path
                    d="M7.88261 5.76798L5.06064 2.93402L3 5.00242L5.80971 7.82271L3.8771 9.83095H9.87107V3.81442L7.88261 5.76798Z"
                    fill="#171717"
                  />
                </svg>
              )}
            </button>
          </div>
          {showWelcomeBanner && (
            <div className="rounded-3xl bg-white shadow-lg border border-[#ededed] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ededed]">
                <h3 className="font-['Gal_Gothic_Variable',sans-serif] text-[20px] font-semibold not-italic leading-6 tracking-[-0.4px] text-[color:var(--Dark-Tint-100---Ink-Black,#171717)]">
                  Welcome to IRL!
                </h3>
                <button
                  type="button"
                  onClick={dismissWelcomeBanner}
                  className="bg-[#ededed] rounded-full size-8 flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
                  aria-label="Dismiss message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[#b5b5b5]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {/* Content */}
              <div className="px-4 py-4">
                <p className="text-sm text-[#313131] leading-relaxed">
                  Every spot on the map is curated by people shaping the local
                  scene.
                </p>
                <p className="text-sm text-[#7d7d7d] mt-2 leading-relaxed">
                  Click on a spot to check in and earn 100 points.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <LocationListsDrawer
        walletAddress={walletAddress}
        onLocationFocus={handleFocusLocationFromList}
        mapBounds={mapBounds}
        userLocation={userLocation}
      />

      {/* Map */}
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
          console.log('[MapBounds] onMoveEnd triggered');
          const bounds = calculateMapBounds();
          if (bounds) {
            console.log('[MapBounds] Setting bounds from onMoveEnd:', bounds);
            setMapBounds(bounds);
          }
        }}
        onLoad={() => {
          // Calculate initial bounds after map loads
          setTimeout(() => {
            const bounds = calculateMapBounds();
            if (bounds) {
              setMapBounds(bounds);
            }
          }, 100);
        }}
        onClick={onMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ position: 'absolute', inset: 0 }}
        cursor="crosshair"
      >
        {/* Permanent Markers (existing locations) */}
        {markers.map((marker, index) => (
          <Marker
            key={`perm-${index}`}
            latitude={marker.latitude}
            longitude={marker.longitude}
            anchor="bottom"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMarkerClick(marker);
              }}
              className="cursor-pointer z-50"
              aria-label={`Marker at ${marker.name}`}
            >
              <div
                className={`relative transition-all ${
                  selectedMarker?.place_id === marker.place_id
                    ? 'scale-110'
                    : ''
                }`}
                style={{ width: '51px', height: '65px' }}
              >
                {/* SVG Pin Background */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="51"
                  height="65"
                  viewBox="0 0 51 65"
                  fill="none"
                  className="absolute inset-0"
                >
                  <g filter="url(#filter0_d_7557_31214)">
                    <path
                      d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                      fill="white"
                    />
                    <path
                      d="M25.2 0.5C33.7419 0.5 40.6999 7.70892 40.7 16.6436C40.7 18.8277 39.7872 21.6669 38.3533 24.7412C36.9263 27.8007 35.0112 31.0358 33.0662 33.9941C31.1221 36.9512 29.1546 39.6224 27.6277 41.5518C26.864 42.5168 26.2136 43.2921 25.7342 43.8232C25.5143 44.0669 25.3343 44.2527 25.2 44.3809C25.0657 44.2527 24.8858 44.0669 24.6658 43.8232C24.1864 43.2921 23.536 42.5168 22.7723 41.5518C21.2454 39.6224 19.2779 36.9512 17.3338 33.9941C15.3888 31.0358 13.4737 27.8007 12.0467 24.7412C10.6128 21.6669 9.70001 18.8277 9.70001 16.6436C9.70016 7.70892 16.6581 0.5 25.2 0.5Z"
                      stroke="white"
                    />
                  </g>
                  <defs>
                    <filter
                      id="filter0_d_7557_31214"
                      x="0"
                      y="0"
                      width="50.4"
                      height="64.2"
                      filterUnits="userSpaceOnUse"
                      colorInterpolationFilters="sRGB"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                      />
                      <feOffset dy="10" />
                      <feGaussianBlur stdDeviation="4.6" />
                      <feComposite in2="hardAlpha" operator="out" />
                      <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 1 0 0 0 0 0.949019608 0 0 0 0 0 0 0 0 1 0"
                      />
                      <feBlend
                        mode="normal"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_7557_31214"
                      />
                      <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_7557_31214"
                        result="shape"
                      />
                    </filter>
                  </defs>
                </svg>
                {/* Image inside pin */}
                {marker.imageUrl && (
                  <img
                    src={marker.imageUrl}
                    alt={marker.name}
                    className="absolute rounded-full object-cover"
                    style={{
                      width: '28px',
                      height: '28px',
                      top: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
              </div>
            </button>
          </Marker>
        ))}

        {/* Temporary marker for searched locations */}
        {searchedLocation && !popupInfo && (
          <Marker
            latitude={searchedLocation.latitude}
            longitude={searchedLocation.longitude}
            anchor="bottom"
          >
            <div className="h-8 w-8 animate-pulse rounded-full border-2 border-white bg-[#FFF200] shadow-md" />
          </Marker>
        )}

        {pendingMapCreateMarker && !popupInfo && !searchedLocation && (
          <Marker
            latitude={pendingMapCreateMarker.latitude}
            longitude={pendingMapCreateMarker.longitude}
            anchor="bottom"
          >
            <div className="h-8 w-8 animate-pulse rounded-full border-2 border-white bg-[#FFF200] shadow-md" />
          </Marker>
        )}

        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="center"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70" />
              <span className="relative inline-flex h-3 w-3 rounded-full border border-white bg-sky-500 dark:border-black" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Centered map card overlay for existing markers */}
      {popupInfo && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="pointer-events-auto">
            <MapCard
              name={popupInfo.name}
              address={popupInfo.address || popupInfo.name}
              description={popupInfo.description}
              isExisting={true}
              onAction={() => handleStartCheckIn(popupInfo)}
              onClose={() => {
                setPopupInfo(null);
                setSelectedMarker(null);
              }}
              isLoading={isCheckingIn}
              imageUrl={popupInfo.imageUrl}
              placeId={popupInfo.place_id}
              eventUrl={popupInfo.event_url}
            />
          </div>
        </div>
      )}

      {/* Centered map card overlay for searched locations */}
      {searchedLocation && !popupInfo && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="pointer-events-auto">
            <MapCard
              name={searchedLocation.name}
              address={searchedLocation.placeFormatted || searchedLocation.name}
              isExisting={false}
              onAction={handleInitiateLocationCreation}
              onClose={() => setSearchedLocation(null)}
              isLoading={false}
              eventUrl={null}
            />
          </div>
        </div>
      )}

      {/* Compact card after map click — new spot not yet on IRL */}
      {pendingMapCreateMarker && !popupInfo && !searchedLocation && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="pointer-events-auto">
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

      {/* Check-In Dialog */}
      <Dialog
        open={showCheckInModal}
        onOpenChange={(open) => {
          if (!open) handleCloseCheckInModal();
        }}
      >
        <DialogContent className="fixed left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          <div className="flex h-full w-full min-h-0 max-w-[393px] flex-col items-stretch overflow-hidden bg-white pb-2 pt-0 mx-auto">
            {/* Hero: location image — first row */}
            {!checkInSuccess && (
              <div
                className="flex h-[258px] w-full shrink-0 items-start gap-2 border border-white/15 p-2 bg-cover bg-center bg-no-repeat bg-[lightgray]"
                style={
                  checkInTarget?.imageUrl
                    ? {
                        backgroundImage: `url(${checkInTarget.imageUrl})`,
                      }
                    : undefined
                }
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={handleCloseCheckInModal}
                    className={`flex h-6 w-6 shrink-0 aspect-square items-center justify-center rounded-full bg-white transition-colors disabled:opacity-50 ${
                      checkInTarget?.imageUrl
                        ? 'text-white drop-shadow hover:text-white/90'
                        : 'text-[#666] hover:text-[#333]'
                    }`}
                    aria-label="Close"
                    disabled={isCheckingIn}
                    type="button"
                  >
                    <svg
                      className="h-6 w-6 shrink-0 aspect-square"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
                        fill="#757575"
                      />
                    </svg>
                  </button>
                </div>
                <div className="min-w-2 flex-1" aria-hidden />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      if (!checkInTarget) return;
                      const target = checkInTarget;
                      handleCloseCheckInModal();
                      setPopupInfo(target);
                      setSelectedMarker(target);
                      setViewState((prev) => ({
                        ...prev,
                        latitude: target.latitude,
                        longitude: target.longitude,
                        zoom: Math.max(prev.zoom ?? 12, 15),
                      }));
                      mapRef.current?.flyTo?.({
                        center: [target.longitude, target.latitude],
                        zoom: 15,
                        duration: 1200,
                      });
                    }}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                      checkInTarget?.imageUrl
                        ? 'text-white drop-shadow hover:bg-white/15'
                        : 'text-[#666] hover:bg-black/5'
                    }`}
                    aria-label="View on Map"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (!checkInTarget?.place_id) return;
                      const shareUrl = `${window.location.origin}/interactive-map?placeId=${encodeURIComponent(checkInTarget.place_id)}`;
                      navigator.clipboard
                        .writeText(shareUrl)
                        .then(() => {
                          toast.success('Link copied to clipboard');
                        })
                        .catch(() => {
                          toast.error('Failed to copy link');
                        });
                    }}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                      checkInTarget?.imageUrl
                        ? 'text-white drop-shadow hover:bg-white/15'
                        : 'text-[#666] hover:bg-black/5'
                    }`}
                    aria-label="Share Location"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Check-In Dialog Content */}

            <div
              className={`relative w-full flex-1 ${checkInSuccess ? 'overflow-hidden' : 'overflow-y-auto'}`}
            >
              {!checkInSuccess ? (
                <>
                  {checkInTarget && (
                    <div className="flex h-[330px] w-full shrink-0 flex-col items-start gap-0 self-stretch px-4 pb-0 pt-0">
                      <div className="flex w-full flex-col justify-start bg-[#ffffff] pb-4 pt-4">
                        <h3 className="line-clamp-1  leading-tight tracking-[-0.3px] text-[#1a1a1a]">
                          {checkInTarget.name || 'Selected Location'}
                        </h3>
                      </div>
                      <div className="flex w-full items-center justify-between self-stretch">
                        <p className="flex label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5  uppercase tracking-[0.3px] text-[#171717]">
                          {formatLocationCategory(checkInTarget.type)}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${checkInTarget.latitude},${checkInTarget.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="title5 flex items-center gap-1 text-[#171717]"
                        >
                          Maps Link
                          <Image
                            src="/arrow-diag-right-black-on-white.svg"
                            alt=""
                            width={16}
                            height={16}
                          />
                        </a>
                      </div>
                      <div className="mt-4 flex w-full items-center">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0 aspect-square"
                        >
                          <path
                            d="M12.4492 6.60348C12.2698 3.59906 10.1489 2.04842 8.00027 2.0007C5.8514 2.04842 3.73051 3.59906 3.55108 6.60348C3.4639 9.67401 5.67749 12.4517 8.00004 14C10.3225 12.4517 12.5364 9.67401 12.4492 6.60348ZM8.00027 8.4728C6.65911 8.4728 5.57161 7.37821 5.57161 6.02778C5.57161 4.67735 6.65888 3.58276 8.00027 3.58276C9.34167 3.58276 10.4289 4.67735 10.4289 6.02778C10.4289 7.37821 9.34167 8.4728 8.00027 8.4728Z"
                            fill="#A9A9A9"
                          />
                        </svg>
                        <p className="label-small ml-2 line-clamp-1 text-[#454545]">
                          {checkInTarget.address || checkInTarget.name}
                        </p>
                      </div>
                      <div className="mt-3 flex w-full items-start pb-4">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0 aspect-square"
                        >
                          <path
                            d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                            fill="#A9A9A9"
                          />
                          <path
                            d="M7.26489 10.7386V6.62662H8.75289V10.7386H7.26489ZM7.27289 6.13862V5.01862H8.75289V6.13862H7.27289Z"
                            fill="#A9A9A9"
                          />
                        </svg>
                        <p className="body-small ml-2 text-[#454545]">
                          {checkInTarget.description ||
                            'No description provided.'}
                        </p>
                      </div>
                      {/* Reviews / Check-ins */}{' '}
                      <div
                        className={`relative w-full flex-1 ${checkInSuccess ? 'overflow-hidden' : 'overflow-y-auto'}`}
                      >
                        {!checkInSuccess ? (
                          <>
                            {checkInTarget && (
                              <div className="flex h-[330px] w-full shrink-0 flex-col items-start gap-0 self-stretch px-2 pb-0 pt-0">
                                <div className="flex w-full flex-col justify-start bg-[#ffffff] px-3 pb-4 pt-4">
                                  <h3 className="line-clamp-1  leading-tight tracking-[-0.3px] text-[#1a1a1a]">
                                    {checkInTarget.name || 'Selected Location'}
                                  </h3>
                                </div>

                                <div className="flex w-full items-center justify-between self-stretch">
                                  <p className="flex label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5  uppercase tracking-[0.3px] text-[#171717]">
                                    {formatLocationCategory(checkInTarget.type)}
                                  </p>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${checkInTarget.latitude},${checkInTarget.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="title5 flex items-center gap-1 text-[#171717]"
                                  >
                                    Maps Link
                                    <Image
                                      src="/arrow-diag-right-black-on-white.svg"
                                      alt=""
                                      width={16}
                                      height={16}
                                    />
                                  </a>
                                </div>

                                <div className="mt-4 flex w-full items-center">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 shrink-0 aspect-square"
                                  >
                                    <path
                                      d="M12.4492 6.60348C12.2698 3.59906 10.1489 2.04842 8.00027 2.0007C5.8514 2.04842 3.73051 3.59906 3.55108 6.60348C3.4639 9.67401 5.67749 12.4517 8.00004 14C10.3225 12.4517 12.5364 9.67401 12.4492 6.60348ZM8.00027 8.4728C6.65911 8.4728 5.57161 7.37821 5.57161 6.02778C5.57161 4.67735 6.65888 3.58276 8.00027 3.58276C9.34167 3.58276 10.4289 4.67735 10.4289 6.02778C10.4289 7.37821 9.34167 8.4728 8.00027 8.4728Z"
                                      fill="#A9A9A9"
                                    />
                                  </svg>
                                  <p className="label-small ml-2 line-clamp-1 text-[#454545]">
                                    {checkInTarget.address ||
                                      checkInTarget.name}
                                  </p>
                                </div>

                                <div className="mt-3 flex w-full items-start pb-4">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 shrink-0 aspect-square"
                                  >
                                    <path
                                      d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                                      fill="#A9A9A9"
                                    />
                                    <path
                                      d="M7.26489 10.7386V6.62662H8.75289V10.7386H7.26489ZM7.27289 6.13862V5.01862H8.75289V6.13862H7.27289Z"
                                      fill="#A9A9A9"
                                    />
                                  </svg>
                                  <p className="body-small ml-2 text-[#454545]">
                                    {checkInTarget.description ||
                                      'No description provided.'}
                                  </p>
                                </div>

                                {/* Reviews / Check-ins */}
                                <section className="flex w-full flex-col items-center gap-4 self-stretch border-t border-[#171717] bg-white pt-4">
                                  <div className="flex w-full items-center justify-between">
                                    <span className="label-small flex h-[22px] flex-[1_0_0] flex-col justify-center uppercase text-[#757575]">
                                      CHECK-INS
                                    </span>
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="flex h-7 items-center gap-2 px-2 py-1 pr-4">
                                        {locationCheckins.length > 0 ? (
                                          locationCheckins
                                            .slice(0, 3)
                                            .map((entry) => (
                                              <div
                                                key={`badge-${entry.id}`}
                                                className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] shadow-sm"
                                              >
                                                {entry.profilePictureUrl ? (
                                                  <img
                                                    src={
                                                      entry.profilePictureUrl
                                                    }
                                                    alt={getCheckinDisplayName(
                                                      entry
                                                    )}
                                                    className="size-7 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  getCheckinInitial(entry)
                                                )}
                                              </div>
                                            ))
                                        ) : (
                                          <div className="flex size-7 items-center justify-center rounded-full bg-[#e8e8e8] text-[10px] font-semibold text-[#999]">
                                            +
                                          </div>
                                        )}
                                      </div>
                                      {locationCheckins.length > 3 ? (
                                        <span className="label-small text-[#454545]">
                                          +{locationCheckins.length - 3} OTHERS
                                        </span>
                                      ) : locationCheckins.length === 0 ? (
                                        <span className="label-small text-[#454545]">
                                          Be first
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex h-[524px] w-full shrink-0 flex-col items-start self-stretch space-y-2">
                                    {isLoadingLocationCheckins ? (
                                      <div className="rounded-xl bg-[#f8f8f8] p-3 animate-pulse">
                                        <div className="flex items-center gap-2">
                                          <div className="size-8 rounded-full bg-[#e8e8e8]" />
                                          <div className="flex-1 space-y-1.5">
                                            <div className="h-2.5 w-16 rounded bg-[#e8e8e8]" />
                                            <div className="h-2 w-12 rounded bg-[#e8e8e8]" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : locationCheckinsError ? (
                                      <div className="rounded-xl bg-[#f8f8f8] p-3">
                                        <p className="text-xs text-[#999] text-center">
                                          {locationCheckinsError}
                                        </p>
                                      </div>
                                    ) : locationCheckins.length === 0 ? (
                                      <div className="rounded-xl bg-[#f8f8f8] p-3 text-center">
                                        <p className="text-[11px] text-[#999] leading-relaxed">
                                          No check-ins yet. Be the first to
                                          share!
                                        </p>
                                      </div>
                                    ) : (
                                      locationCheckins
                                        .slice(0, 3)
                                        .map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="w-full rounded-xl bg-[#ffffff] p-2.5"
                                          >
                                            <div className="flex w-full items-start gap-2 border-t border-[#DBDBDB] pt-4">
                                              <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shrink-0 overflow-hidden">
                                                {entry.profilePictureUrl ? (
                                                  <img
                                                    src={
                                                      entry.profilePictureUrl
                                                    }
                                                    alt={getCheckinDisplayName(
                                                      entry
                                                    )}
                                                    className="size-7 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  getCheckinInitial(entry)
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2"></div>
                                                <p className="leading-snug text-[#454545] mt-0.5 body-small">
                                                  {entry.comment}
                                                </p>
                                                <div className="mt-2 inline-flex h-7 self-start items-center justify-center gap-2 border border-[#DBDBDB] px-2 py-1 pr-4">
                                                  <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 shrink-0"
                                                  >
                                                    <path
                                                      d="M3.05009 8.71835C3.52996 8.26915 4.16079 8.01803 4.81751 8.01586C6.33908 8.01045 8.74814 7.9769 8.74814 7.9769H9.69817C10.2535 7.9769 10.7043 8.42935 10.7043 8.98679C10.7043 9.54424 10.2535 9.99669 9.69817 9.99669H6.28085C6.08675 9.99669 5.92931 10.1547 5.92931 10.3496C5.92931 10.5444 6.08675 10.7024 6.28085 10.7024H9.74671C10.6428 10.7024 11.3696 9.97288 11.3696 9.07339V8.6231C11.3696 8.51378 11.4117 8.4077 11.4883 8.32868L12.8955 6.79056C13.2891 6.35976 13.962 6.34677 14.3718 6.7635C14.7438 7.14126 14.7665 7.74093 14.4246 8.14575L11.6597 11.4179C11.2607 11.8898 10.6752 12.1615 10.0584 12.1615H5.57776L4.29343 13.0372C4.25353 13.0773 1.56519 10.1093 1.56519 10.1093L3.05117 8.71835H3.05009ZM8.68237 3.33331C7.55332 3.33331 6.63886 4.2512 6.63886 5.3845C6.63886 6.51779 7.55332 7.43569 8.68237 7.43569C9.81141 7.43569 10.7259 6.51779 10.7259 5.3845C10.7259 4.2512 9.81141 3.33331 8.68237 3.33331Z"
                                                      fill="#757575"
                                                    />
                                                  </svg>
                                                  <span className="label-small text-[#757575]">
                                                    {entry.pointsEarned}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </section>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Success Screen */
                          <div
                            className="relative flex flex-col items-center justify-center min-h-[400px] w-full overflow-hidden"
                            style={{
                              backgroundImage: "url('/city-bg.jpg')",
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                          >
                            <div className="relative z-10 flex flex-col items-center gap-7 px-4 py-16 w-full h-full justify-center">
                              {/* Location Marker Icon */}
                              <div
                                className="relative shrink-0"
                                style={{ width: '46px', height: '66px' }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="46"
                                  height="66"
                                  viewBox="0 0 46 66"
                                  fill="none"
                                  className="absolute inset-0"
                                >
                                  <g filter="url(#filter_checkin_success)">
                                    <path
                                      d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                                      fill="white"
                                    />
                                  </g>
                                  <defs>
                                    <filter
                                      id="filter_checkin_success"
                                      x="0"
                                      y="0"
                                      width="50.4"
                                      height="64.2"
                                      filterUnits="userSpaceOnUse"
                                      colorInterpolationFilters="sRGB"
                                    >
                                      <feFlood
                                        floodOpacity="0"
                                        result="BackgroundImageFix"
                                      />
                                      <feColorMatrix
                                        in="SourceAlpha"
                                        type="matrix"
                                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                        result="hardAlpha"
                                      />
                                      <feOffset dy="10" />
                                      <feGaussianBlur stdDeviation="4.6" />
                                      <feComposite
                                        in2="hardAlpha"
                                        operator="out"
                                      />
                                      <feColorMatrix
                                        type="matrix"
                                        values="0 0 0 0 1 0 0 0 0 0.949019608 0 0 0 0 0 0 0 0 1 0"
                                      />
                                      <feBlend
                                        mode="normal"
                                        in2="BackgroundImageFix"
                                        result="effect1_dropShadow_7557_31214"
                                      />
                                      <feBlend
                                        mode="normal"
                                        in="SourceGraphic"
                                        in2="effect1_dropShadow_7557_31214"
                                        result="shape"
                                      />
                                    </filter>
                                  </defs>
                                </svg>
                                {checkInTarget?.imageUrl && (
                                  <div
                                    className="absolute bg-[#ededed] rounded-full shadow-[0px_0px_16px_0px_rgba(255,255,255,0.7)]"
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      top: '0px',
                                      left: '10px',
                                    }}
                                  >
                                    <img
                                      src={checkInTarget.imageUrl}
                                      alt={checkInTarget.name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Upper Section */}
                              <div className="flex flex-col gap-4 items-center w-full">
                                {/* Reward Section */}
                                <div className="flex flex-col gap-2 items-center w-full">
                                  <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                                    You Earned
                                  </p>
                                  <p
                                    className="text-6xl text-white tracking-[-4px] font-bold"
                                    style={{
                                      fontFamily:
                                        '"Pleasure Variable Trial", sans-serif',
                                    }}
                                  >
                                    {checkInPointsEarned}
                                  </p>
                                </div>

                                {/* Checking In At Section */}
                                <div className="flex flex-col gap-2 items-center w-full">
                                  <p
                                    className="text-[11px] text-white uppercase tracking-[0.44px]"
                                    style={{
                                      fontFamily:
                                        '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                                      fontWeight: 500,
                                    }}
                                  >
                                    Checking In At
                                  </p>
                                  <div className="flex items-center">
                                    <div className="flex gap-1 items-center justify-center border border-white rounded-full px-2 py-1.5">
                                      <div className="shrink-0 w-4 h-4">
                                        <svg
                                          className="w-4 h-4 text-white"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                          />
                                        </svg>
                                      </div>
                                      <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                                        {checkInTarget?.name || 'Location'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <section className="flex w-full flex-col items-center gap-4 self-stretch border-t border-[#171717] bg-white pt-4">
                        <div className="flex w-full items-center justify-between">
                          <span className="label-small flex h-[22px] flex-[1_0_0] flex-col justify-center uppercase text-[#757575]">
                            CHECK-INS
                          </span>
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex h-7 items-center gap-2 px-2 py-1 pr-4">
                              {locationCheckins.length > 0 ? (
                                locationCheckins.slice(0, 3).map((entry) => (
                                  <div
                                    key={`badge-${entry.id}`}
                                    className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] shadow-sm"
                                  >
                                    {entry.profilePictureUrl ? (
                                      <img
                                        src={entry.profilePictureUrl}
                                        alt={getCheckinDisplayName(entry)}
                                        className="size-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      getCheckinInitial(entry)
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="flex size-7 items-center justify-center rounded-full bg-[#e8e8e8] text-[10px] font-semibold text-[#999]">
                                  +
                                </div>
                              )}
                            </div>
                            {locationCheckins.length > 3 ? (
                              <span className="label-small text-[#454545]">
                                +{locationCheckins.length - 3} OTHERS
                              </span>
                            ) : locationCheckins.length === 0 ? (
                              <span className="label-small text-[#454545]">
                                Be first
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex h-[524px] w-full shrink-0 flex-col items-start self-stretch space-y-2 [&>*]:w-full">
                          {isLoadingLocationCheckins ? (
                            <div className="rounded-xl bg-[#f8f8f8] p-3 animate-pulse">
                              <div className="flex items-center gap-2">
                                <div className="size-8 rounded-full bg-[#e8e8e8]" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-2.5 w-16 rounded bg-[#e8e8e8]" />
                                  <div className="h-2 w-12 rounded bg-[#e8e8e8]" />
                                </div>
                              </div>
                            </div>
                          ) : locationCheckinsError ? (
                            <div className="rounded-xl bg-[#f8f8f8] p-3">
                              <p className="text-xs text-[#999] text-center">
                                {locationCheckinsError}
                              </p>
                            </div>
                          ) : locationCheckins.length === 0 ? (
                            <div className="rounded-xl bg-[#f8f8f8] p-3 text-center">
                              <p className="text-[11px] text-[#999] leading-relaxed">
                                No check-ins yet. Be the first to share!
                              </p>
                            </div>
                          ) : (
                            locationCheckins.slice(0, 3).map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-xl bg-[#ffffff]"
                              >
                                <div className="flex w-full items-start gap-2 border-t border-[#DBDBDB] pt-4">
                                  <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d]  font-semibold text-[#313131] flex items-center justify-center shrink-0 overflow-hidden">
                                    {entry.profilePictureUrl ? (
                                      <img
                                        src={entry.profilePictureUrl}
                                        alt={getCheckinDisplayName(entry)}
                                        className="size-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      getCheckinInitial(entry)
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2"></div>
                                    <p className="leading-snug text-[#454545] mt-0.5 body-small">
                                      {entry.comment}
                                    </p>
                                    <div className="mt-2 inline-flex h-7 self-start items-center justify-center gap-2 border border-[#DBDBDB] py-1 pr-4">
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 shrink-0"
                                      >
                                        <path
                                          d="M3.05009 8.71835C3.52996 8.26915 4.16079 8.01803 4.81751 8.01586C6.33908 8.01045 8.74814 7.9769 8.74814 7.9769H9.69817C10.2535 7.9769 10.7043 8.42935 10.7043 8.98679C10.7043 9.54424 10.2535 9.99669 9.69817 9.99669H6.28085C6.08675 9.99669 5.92931 10.1547 5.92931 10.3496C5.92931 10.5444 6.08675 10.7024 6.28085 10.7024H9.74671C10.6428 10.7024 11.3696 9.97288 11.3696 9.07339V8.6231C11.3696 8.51378 11.4117 8.4077 11.4883 8.32868L12.8955 6.79056C13.2891 6.35976 13.962 6.34677 14.3718 6.7635C14.7438 7.14126 14.7665 7.74093 14.4246 8.14575L11.6597 11.4179C11.2607 11.8898 10.6752 12.1615 10.0584 12.1615H5.57776L4.29343 13.0372C4.25353 13.0773 1.56519 10.1093 1.56519 10.1093L3.05117 8.71835H3.05009ZM8.68237 3.33331C7.55332 3.33331 6.63886 4.2512 6.63886 5.3845C6.63886 6.51779 7.55332 7.43569 8.68237 7.43569C9.81141 7.43569 10.7259 6.51779 10.7259 5.3845C10.7259 4.2512 9.81141 3.33331 8.68237 3.33331Z"
                                          fill="#757575"
                                        />
                                      </svg>
                                      <span className="label-small text-[#757575]">
                                        {entry.pointsEarned}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>
                  )}
                </>
              ) : (
                /* Success Screen */
                <div
                  className="relative flex flex-col items-center justify-center min-h-[400px] w-full overflow-hidden"
                  style={{
                    backgroundImage: "url('/city-bg.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="relative z-10 flex flex-col items-center gap-7 px-4 py-16 w-full h-full justify-center">
                    {/* Location Marker Icon */}
                    <div
                      className="relative shrink-0"
                      style={{ width: '46px', height: '66px' }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="46"
                        height="66"
                        viewBox="0 0 46 66"
                        fill="none"
                        className="absolute inset-0"
                      >
                        <g filter="url(#filter_checkin_success)">
                          <path
                            d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                            fill="white"
                          />
                        </g>
                        <defs>
                          <filter
                            id="filter_checkin_success"
                            x="0"
                            y="0"
                            width="50.4"
                            height="64.2"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                          >
                            <feFlood
                              floodOpacity="0"
                              result="BackgroundImageFix"
                            />
                            <feColorMatrix
                              in="SourceAlpha"
                              type="matrix"
                              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                              result="hardAlpha"
                            />
                            <feOffset dy="10" />
                            <feGaussianBlur stdDeviation="4.6" />
                            <feComposite in2="hardAlpha" operator="out" />
                            <feColorMatrix
                              type="matrix"
                              values="0 0 0 0 1 0 0 0 0 0.949019608 0 0 0 0 0 0 0 0 1 0"
                            />
                            <feBlend
                              mode="normal"
                              in2="BackgroundImageFix"
                              result="effect1_dropShadow_7557_31214"
                            />
                            <feBlend
                              mode="normal"
                              in="SourceGraphic"
                              in2="effect1_dropShadow_7557_31214"
                              result="shape"
                            />
                          </filter>
                        </defs>
                      </svg>
                      {checkInTarget?.imageUrl && (
                        <div
                          className="absolute bg-[#ededed] rounded-full shadow-[0px_0px_16px_0px_rgba(255,255,255,0.7)]"
                          style={{
                            width: '30px',
                            height: '30px',
                            top: '0px',
                            left: '10px',
                          }}
                        >
                          <img
                            src={checkInTarget.imageUrl}
                            alt={checkInTarget.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Upper Section */}
                    <div className="flex flex-col gap-4 items-center w-full">
                      {/* Reward Section */}
                      <div className="flex flex-col gap-2 items-center w-full">
                        <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                          You Earned
                        </p>
                        <p
                          className="text-6xl text-white tracking-[-4px] font-bold"
                          style={{
                            fontFamily: '"Pleasure Variable Trial", sans-serif',
                          }}
                        >
                          {checkInPointsEarned}
                        </p>
                      </div>

                      {/* Checking In At Section */}
                      <div className="flex flex-col gap-2 items-center w-full">
                        <p
                          className="text-[11px] text-white uppercase tracking-[0.44px]"
                          style={{
                            fontFamily:
                              '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          Checking In At
                        </p>
                        <div className="flex items-center">
                          <div className="flex gap-1 items-center justify-center border border-white rounded-full px-2 py-1.5">
                            <div className="shrink-0 w-4 h-4">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </div>
                            <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                              {checkInTarget?.name || 'Location'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!checkInSuccess ? (
              <div className="sticky bottom-0 z-20 w-full border-t border-[#DBDBDB] bg-white px-4 py-2">
                <div className="flex w-full items-center justify-between gap-2 self-stretch">
                  <div className="flex self-stretch items-center gap-2 border border-[#DBDBDB] pl-2 pr-4">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.2716 2.99296C12.0826 2.84567 11.8803 2.71177 11.6557 2.61804C9.99048 1.91953 7.6916 1.88382 5.93186 2.16278C5.12148 2.2911 3.4529 2.70954 3.27393 3.67808L3.28615 11.8962C3.28615 12.2811 3.66411 12.5947 3.95536 12.7743C4.51896 13.1213 5.12258 13.2898 5.77623 13.4048C7.59266 13.7239 10.1672 13.706 11.8758 12.8725C12.2238 12.7029 12.7229 12.2677 12.7229 11.8638L12.7262 3.91575C12.7262 3.52856 12.565 3.2217 12.2705 2.99296H12.2716ZM11.8514 7.58794C11.8514 7.77986 11.7569 7.96174 11.5946 8.06217C11.101 8.36902 10.2417 8.5509 9.79483 8.6145C8.24853 8.83655 5.92408 8.8187 4.49006 8.1068C4.23438 7.98853 4.16546 7.85128 4.15435 7.66717C4.14323 7.48306 4.16546 6.96866 4.16546 6.94857C6.09861 7.86355 9.90822 7.88587 11.8503 6.94188L11.8525 7.58794H11.8514ZM5.55835 3.14471C7.14356 2.79992 8.78434 2.79099 10.3729 3.12574C10.6975 3.19492 11.7747 3.50959 11.8325 3.81532C11.8847 4.09428 10.7764 4.43796 10.4774 4.50491C8.83215 4.87425 7.14578 4.86421 5.52389 4.50268C5.23153 4.43796 4.12989 4.10209 4.16213 3.81198C4.19325 3.53191 5.24932 3.21166 5.55835 3.1436V3.14471ZM4.15879 4.90437C6.09194 5.81935 9.90155 5.84167 11.8436 4.89768L11.8458 5.54375C11.8458 5.73567 11.7513 5.91755 11.589 6.01797C11.0955 6.32483 10.2362 6.5067 9.78927 6.5703C8.24297 6.79235 5.91852 6.7745 4.4845 6.0626C4.22882 5.94433 4.15991 5.80708 4.14879 5.62297C4.13767 5.43886 4.1599 4.92446 4.1599 4.90437H4.15879ZM4.15879 8.93475C6.09194 9.84973 9.90155 9.87204 11.8436 8.92805L11.8458 9.57412C11.8458 9.76604 11.7513 9.94792 11.589 10.0483C11.0955 10.3552 10.2362 10.5371 9.78927 10.6007C8.24297 10.8227 5.91852 10.8049 4.4845 10.093C4.22882 9.9747 4.15991 9.83745 4.14879 9.65334C4.13767 9.46923 4.1599 8.95483 4.1599 8.93475H4.15879ZM11.5946 12.0725C11.101 12.3793 10.2417 12.5612 9.79483 12.6248C8.24853 12.8468 5.92408 12.829 4.49006 12.1171C4.23438 11.9988 4.16546 11.8616 4.15435 11.6775C4.14323 11.4933 4.16546 10.9789 4.16546 10.9589C6.09861 11.8738 9.90822 11.8962 11.8503 10.9522L11.8525 11.5982C11.8525 11.7902 11.758 11.972 11.5957 12.0725H11.5946Z"
                        fill="#757575"
                      />
                    </svg>
                    <span className="label-medium text-[#000000]">
                      {checkInTarget?.points_value ?? 100}
                    </span>
                    <svg
                      width="32"
                      height="18"
                      viewBox="0 0 32 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M32 18H0V0H32V18ZM22.5732 5.2959C21.9935 5.29593 21.4873 5.39475 21.0566 5.59277C20.6252 5.79157 20.2953 6.06956 20.0664 6.42871C19.8375 6.78718 19.7236 7.20801 19.7236 7.68848C19.7237 8.16857 19.824 8.53138 20.0264 8.84375C20.2281 9.15694 20.5131 9.40625 20.8789 9.59375C21.2448 9.78047 21.6915 9.93144 22.2178 10.0459C22.6906 10.1453 23.0479 10.2388 23.2881 10.3262C23.5282 10.4142 23.7026 10.52 23.8096 10.6465C23.9165 10.7722 23.9697 10.9357 23.9697 11.1338C23.9696 11.401 23.8516 11.6204 23.6152 11.792C23.3788 11.9636 23.0352 12.0488 22.585 12.0488C22.1045 12.0488 21.7274 11.9458 21.457 11.7402C21.1863 11.534 21.0393 11.2366 21.0166 10.8477H19.4941C19.5243 11.5801 19.805 12.1676 20.335 12.6104C20.8651 13.0532 21.6232 13.2744 22.6074 13.2744C23.1797 13.2744 23.7008 13.1809 24.1699 12.9941C24.6391 12.8074 25.0134 12.5227 25.292 12.1416C25.5706 11.7598 25.71 11.2907 25.71 10.7334C25.7099 10.0241 25.4887 9.49139 25.0459 9.13672L25.0469 9.13574C24.6041 8.78104 23.9553 8.5269 23.1006 8.37402C22.6654 8.29044 22.3313 8.20663 22.0986 8.12305C21.8661 8.0395 21.6946 7.93748 21.584 7.81934C21.4733 7.7011 21.418 7.55019 21.418 7.36719C21.418 7.10817 21.522 6.90188 21.7275 6.74902C21.9339 6.59629 22.2275 6.52051 22.6084 6.52051C22.9894 6.52054 23.2968 6.60986 23.5068 6.78906C23.7168 6.96828 23.8363 7.21835 23.8672 7.53906H25.4014C25.3404 6.82966 25.0575 6.27787 24.5537 5.88477C24.05 5.49192 23.3901 5.2959 22.5732 5.2959ZM6.99512 13.1582H8.91895V10.4004H10.0859C10.7268 10.4004 11.2786 10.2964 11.7402 10.0908C12.2016 9.88451 12.5528 9.59504 12.793 9.22168C13.0332 8.84823 13.1533 8.40895 13.1533 7.90527C13.1533 7.40146 13.029 6.93009 12.7812 6.55957C12.5335 6.18998 12.1804 5.90503 11.7227 5.70703H11.7236C11.2658 5.50897 10.7193 5.40918 10.0859 5.40918H6.99512V13.1582ZM13.5547 6.70312H15.3975V13.1582H17.332V6.70312H19.1865V5.40918H13.5547V6.70312ZM9.99414 6.69141C10.4136 6.69141 10.7305 6.79539 10.9443 7.00098C11.1582 7.20732 11.2656 7.50844 11.2656 7.90527C11.2656 8.30193 11.157 8.59022 10.9395 8.79199C10.7218 8.99457 10.4061 9.0957 9.99414 9.0957H8.91797V6.69141H9.99414Z"
                        fill="#757575"
                      />
                    </svg>
                  </div>
                  <button
                    onClick={() => setShowCheckInCommentModal(true)}
                    disabled={isCheckingIn || !checkInTarget}
                    className="flex h-11 w-full flex-[1_0_0] self-stretch items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-4 py-2 transition-colors hover:bg-black disabled:opacity-50"
                    type="button"
                  >
                    <span className="label-medium label-large uppercase text-[#ffffff]">
                      Check-In
                    </span>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="block size-6 max-w-none"
                      aria-hidden="true"
                    >
                      <path
                        d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                        fill="#DBDBDB"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full px-4 py-2">
                <button
                  onClick={handleCloseCheckInModal}
                  className="flex h-11 w-full items-center justify-between bg-black px-4 py-2 transition-colors"
                >
                  <span className="label-medium label-large uppercase text-[#ffffff]">
                    Done
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="block size-6 max-w-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                      fill="#DBDBDB"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-In Comment Modal */}
      <Dialog
        open={showCheckInCommentModal}
        onOpenChange={(open) => {
          if (!open) setShowCheckInCommentModal(false);
        }}
      >
        <DialogContent className="fixed left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 border-none bg-transparent p-0 shadow-none [&>button]:hidden">
          <div className="flex h-full w-full min-h-0 max-w-[393px] flex-col overflow-hidden bg-white mx-auto">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] bg-white px-4 py-3">
              <h3 className="label-large tracking-[-0.5px] text-[#1a1a1a]">
                Check-In
              </h3>
              <button
                onClick={() => setShowCheckInCommentModal(false)}
                className="text-[#999] transition-colors hover:text-[#666]"
                aria-label="Close comment modal"
                type="button"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="checkInComment"
                  className="text-[10px] font-medium uppercase tracking-[0.3px] text-[#999]"
                >
                  Your Comment <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="checkInComment"
                  value={checkInComment}
                  onChange={(e) => setCheckInComment(e.target.value)}
                  placeholder="Share why this place is worth visiting..."
                  className="min-h-[140px] rounded-xl border border-[#e8e8e8] bg-white p-3 text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] resize-none focus-visible:border-[#999] focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={500}
                  disabled={isCheckingIn}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-20 w-full border-t border-[#DBDBDB] bg-white p-4 pt-3">
              <div className="flex w-full gap-2">
                <button
                  onClick={() => setShowCheckInCommentModal(false)}
                  className="flex h-11 flex-1 items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#757575)] px-4 py-2 transition-colors hover:bg-black disabled:opacity-50"
                  disabled={isCheckingIn}
                  type="button"
                >
                  <span className="label-medium label-large uppercase text-[#ffffff]">
                    Cancel
                  </span>
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn || !checkInComment.trim()}
                  className="flex h-11 flex-1 items-center justify-between bg-black px-4 py-2 transition-colors  disabled:opacity-50"
                  type="button"
                >
                  <span className="label-medium label-large uppercase text-[#ffffff]">
                    {isCheckingIn ? '...' : 'Submit'}
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="block size-6 max-w-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                      fill="#DBDBDB"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New location — bottom drawer (map stays visible above) */}
      {showLocationForm && (
        <div
          className="fixed inset-x-0 bottom-0 z-[80] flex justify-center pointer-events-none px-0 sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-location-drawer-title"
        >
          <div className="pointer-events-auto flex w-full max-w-[393px] max-h-[min(88vh,640px)] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#ebebeb] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:border-b sm:mb-[max(0.5rem,env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            {formStep !== 'success' && (
              <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={handleCloseLocationForm}
                    className="shrink-0 text-[#999] transition-colors hover:text-[#666] disabled:opacity-50"
                    aria-label="Close"
                    disabled={isCreatingLocation}
                    type="button"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <h2
                    id="new-location-drawer-title"
                    className="truncate text-[#1a1a1a] tracking-[-0.5px]"
                  >
                    New Location
                  </h2>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Step 1: Business Details */}
              {formStep === 'business-details' && (
                <div className="p-3">
                  <div className="flex flex-col gap-3">
                    {/* Name Field */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="name"
                        className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                      >
                        Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter location name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="rounded-xl px-3 h-10 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999]"
                        maxLength={100}
                      />
                    </div>

                    {/* Address Field */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="address"
                        className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                      >
                        Address
                      </label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Enter address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="rounded-xl px-3 h-10 border border-[#e8e8e8] bg-[#fafafa] text-sm tracking-[-0.2px] text-[#666] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={200}
                      />
                    </div>

                    {/* Description Field */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="description"
                        className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                      >
                        Description
                      </label>
                      <Textarea
                        id="description"
                        placeholder="What makes this place special?"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="min-h-[70px] rounded-xl p-3 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999] resize-none"
                        maxLength={500}
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]">
                        Image <span className="text-red-500">*</span>
                      </label>
                      {formData.locationImage ? (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(formData.locationImage)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                locationImage: null,
                              }));
                            }}
                            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-sm"
                          >
                            <svg
                              className="w-3 h-3 text-[#666]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="locationImage"
                          className="bg-[#f8f8f8] border border-dashed border-[#d0d0d0] rounded-xl flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-[#f0f0f0] hover:border-[#999] transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-[#999] mb-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]">
                            Upload image
                          </p>
                        </label>
                      )}
                      <input
                        id="locationImage"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setFormData((prev) => ({
                            ...prev,
                            locationImage: file || null,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Success Screen */}
              {formStep === 'success' && (
                <div
                  className="relative flex flex-col items-center justify-center min-h-[320px] w-full overflow-hidden"
                  style={{
                    backgroundImage: "url('/city-bg.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="relative z-10 flex flex-col items-center gap-5 px-4 py-10 w-full h-full justify-center">
                    {/* Success checkmark */}
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    {/* Reward Section */}
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] text-white/80 uppercase tracking-[0.3px] font-medium">
                        You Earned
                      </p>
                      <p
                        className="text-5xl text-white tracking-[-3px] font-bold"
                        style={{
                          fontFamily: '"Pleasure Variable Trial", sans-serif',
                        }}
                      >
                        {pointsEarned.creation}
                      </p>
                      <p className="text-[10px] text-white/70 uppercase tracking-[0.3px] font-medium mt-1">
                        Points for creating location
                      </p>
                    </div>

                    {/* Pending Approval Message */}
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <p className="text-[11px] text-white/90 text-center leading-relaxed px-4">
                        Your location is pending review and will appear on the
                        map once approved by an admin.
                      </p>
                    </div>

                    {/* Location badge */}
                    <div className="flex gap-1.5 items-center border border-white/30 rounded-full px-2.5 py-1.5 bg-white/10 backdrop-blur-sm mt-2">
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-[10px] text-white uppercase tracking-[0.3px] font-medium">
                        {formData.name || selectedMarker?.name || 'Location'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {formStep !== 'success' ? (
              <div className="shrink-0 p-3 pt-0">
                <button
                  onClick={handleBusinessDetailsNext}
                  disabled={isCreatingLocation}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors disabled:opacity-50 w-full"
                >
                  {isCreatingLocation ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            ) : (
              <div className="shrink-0 p-3">
                <button
                  onClick={handleCloseLocationForm}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
