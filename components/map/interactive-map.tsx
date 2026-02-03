'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import LocationSearch from '@/components/shared/location-search';
import { deriveDisplayNameAndAddress } from '@/lib/utils/location-autofill';
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
  display_name: string;
  name: string;
  description?: string | null;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
  type?: string;
  event_url?: string | null;
}

interface LocationCheckinPreview {
  id: number;
  comment: string;
  imageUrl?: string | null;
  pointsEarned: number;
  createdAt?: string | null;
  username?: string | null;
  walletAddress?: string | null;
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
  display_name: string;
  name: string;
  placeFormatted?: string;
}

const WELCOME_BANNER_STORAGE_KEY = 'irl-map-welcome-dismissed';
const WELCOME_BANNER_MAX_SHOWS = 3;
const LOCATION_INSTRUCTION_STORAGE_KEY =
  'irl-location-create-instruction-count';
const LOCATION_INSTRUCTION_LIMIT = 3;

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

function formatCheckinTimestamp(timestamp?: string | null) {
  if (!timestamp) return 'Moments ago';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  try {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

interface InteractiveMapProps {
  initialPlaceId?: string | null;
}

export default function InteractiveMap({
  initialPlaceId,
}: InteractiveMapProps) {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [userUsername, setUserUsername] = useState<string | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -73.9442,
    latitude: 40.7081,
    zoom: 8,
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
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
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

  // Center map on user's current location once on mount (with fallback)
  useEffect(() => {
    if (hasSetInitialLocationRef.current) return;
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
  }, []);

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
            display_name: loc.display_name,
            name: loc.name,
            description: loc.description ?? null,
            creator_wallet_address: loc.creator_wallet_address ?? null,
            creator_username: loc.creator_username ?? null,
            imageUrl: loc.coin_image_url ?? null,
            type: loc.type ?? 'location',
            event_url: loc.event_url ?? null,
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

    const { lngLat } = event;
    const longitude = lngLat.lng;
    const latitude = lngLat.lat;

    try {
      // Use reverse geocoding to get location information
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=poi,place,address`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          // Determine if this is a POI or address based on feature properties
          const isPOI =
            feature.properties?.category === 'poi' ||
            feature.properties?.poi ||
            feature.place_type?.includes('poi');
          const spotName = isPOI ? feature.text || '' : '';
          const fullAddress = feature.place_name || '';

          // For POIs, strip the POI name prefix from the address if present
          let address = fullAddress;
          if (isPOI && spotName && fullAddress.startsWith(`${spotName}, `)) {
            address = fullAddress.slice(`${spotName}, `.length);
          } else if (!isPOI) {
            address = fullAddress;
          }

          const newMarker: MarkerData = {
            latitude,
            longitude,
            place_id: feature.id || `temp-${Date.now()}`,
            display_name: spotName || '', // Spot name (empty for addresses)
            name: address || 'Unknown Location', // Address
          };
          const duplicateMarker = findExistingMarker(newMarker.place_id);
          if (duplicateMarker) {
            toast.info('That location already exists—check it out instead!');
            setSelectedMarker(duplicateMarker);
            setPopupInfo(duplicateMarker);
            setShowLocationForm(false);
            setSearchedLocation(null);
            return;
          }

          setSelectedMarker(newMarker);
          setFormData({
            name: newMarker.display_name, // Spot name (can be empty for addresses)
            address: newMarker.name, // Address
            description: '',
            locationImage: null,
            checkInComment: '',
          });
          setFormStep('business-details');
          setShowLocationForm(true);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Still allow creating even if reverse geocoding fails
      const newMarker: MarkerData = {
        latitude,
        longitude,
        place_id: `temp-${Date.now()}`,
        display_name: '', // No spot name for fallback case
        name: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, // Use coordinates as address
      };

      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.display_name, // Spot name (empty)
        address: newMarker.name, // Address (coordinates)
        description: '',
        locationImage: null,
        checkInComment: '',
      });
      setFormStep('business-details');
      setShowLocationForm(true);
    }
  };

  const handleSearchSelect = (picked: {
    longitude: number;
    latitude: number;
    id: string;
    name?: string;
    placeFormatted?: string;
    featureType?: string;
  }) => {
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
        display_name: displayName || 'Unknown Location',
        name: address || 'Unknown Location',
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
            display_name: checkInTarget.display_name,
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
      return;
    }

    // Set up for creating the location
    const newMarker: MarkerData = {
      latitude: searchedLocation.latitude,
      longitude: searchedLocation.longitude,
      place_id: searchedLocation.place_id,
      display_name: searchedLocation.display_name,
      name: searchedLocation.name,
    };

    setSelectedMarker(newMarker);
    setFormData({
      name: searchedLocation.display_name, // display_name is the spot name
      address: searchedLocation.name, // name is the address
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
          display_name: formData.name || selectedMarker.display_name, // formData.name is the spot name
          name: formData.address || selectedMarker.name, // formData.address is the address
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
                  display_name: existingLocation.display_name,
                  name: existingLocation.name,
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
              display_name: result.location.display_name,
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
    setPointsEarned({ creation: 0, checkIn: 0 });
    setFormData({
      name: '',
      address: '',
      description: '',
      locationImage: null,
      checkInComment: '',
    });
  };

  const handleFocusLocationFromList = (location: DrawerLocationSummary) => {
    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      return;
    }

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
        display_name: location.display_name || location.context || '',
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
      {/* MapNav Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/20 to-transparent">
        <div className="max-w-md w-full mx-auto px-4 py-4">
          <MapNav />
        </div>
      </div>

      {/* Search Bar - Centered Below Header */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <LocationSearch
                placeholder="Search location"
                proximity={{
                  longitude: viewState.longitude,
                  latitude: viewState.latitude,
                }}
                onSelect={handleSearchSelect}
              />
            </div>
            <button
              type="button"
              onClick={handleLocateUser}
              disabled={isLocating}
              className="flex items-center justify-center size-10 rounded-full bg-white/80 text-[#7d7d7d] shadow-sm transition-colors hover:bg-white hover:text-[#313131] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/50 dark:text-white/70 dark:hover:bg-black/70 dark:hover:text-white shrink-0"
              aria-label={isLocating ? 'Locating...' : 'My Location'}
            >
              {isLocating ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              )}
            </button>
          </div>
          {showWelcomeBanner && (
            <div className="rounded-3xl bg-white shadow-lg border border-[#ededed] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ededed]">
                <h3 className="text-base font-inktrap text-[#313131] tracking-[-1.28px]">
                  Welcome
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
                  You&apos;re in! Complete your first check-in to earn points.
                </p>
                <p className="text-sm text-[#7d7d7d] mt-2 leading-relaxed">
                  Use the search bar or tap the map to find a place nearby.
                </p>
              </div>
              {/* Footer */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={dismissWelcomeBanner}
                  className="w-full flex items-center justify-center rounded-full bg-[#313131] h-10 text-sm font-inktrap text-white transition-colors hover:bg-[#424242]"
                >
                  Start exploring
                </button>
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
                        values="0 0 0 0 0.4 0 0 0 0 0.835294 0 0 0 0 0.458824 0 0 0 1 0"
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

        {/* Popup for existing markers */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.latitude}
            longitude={popupInfo.longitude}
            onClose={() => {
              setPopupInfo(null);
              setSelectedMarker(null);
            }}
            closeButton={false}
            closeOnClick={false}
            className="z-50 [&>button]:hidden"
          >
            <MapCard
              name={popupInfo.name}
              address={popupInfo.display_name}
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
          </Popup>
        )}

        {/* Popup for searched locations */}
        {searchedLocation && !popupInfo && (
          <Popup
            latitude={searchedLocation.latitude}
            longitude={searchedLocation.longitude}
            onClose={() => setSearchedLocation(null)}
            closeButton={false}
            closeOnClick={false}
            className="z-50 [&>button]:hidden"
          >
            <MapCard
              name={searchedLocation.display_name}
              address={searchedLocation.name}
              isExisting={false}
              onAction={handleInitiateLocationCreation}
              onClose={() => setSearchedLocation(null)}
              isLoading={false}
              eventUrl={null}
            />
          </Popup>
        )}

        {/* Temporary marker for searched locations */}
        {searchedLocation && !popupInfo && (
          <Marker
            latitude={searchedLocation.latitude}
            longitude={searchedLocation.longitude}
            anchor="bottom"
          >
            <div className="w-8 h-8 rounded-full border-2 shadow-md bg-yellow-400 border-white animate-pulse" />
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

      {/* Check-In Dialog */}
      <Dialog
        open={showCheckInModal}
        onOpenChange={(open) => {
          if (!open) handleCloseCheckInModal();
        }}
      >
        <DialogContent className="w-full max-w-[340px] p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <div
            className={`rounded-2xl overflow-hidden max-h-[85vh] flex flex-col bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]`}
          >
            {/* Header */}
            {!checkInSuccess && (
              <div className="bg-white flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseCheckInModal}
                    className="text-[#999] hover:text-[#666] transition-colors disabled:opacity-50"
                    aria-label="Close"
                    disabled={isCheckingIn}
                  >
                    <svg
                      className="w-5 h-5"
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
                  <h2 className="text-sm font-inktrap text-[#1a1a1a] tracking-[-0.5px]">
                    Check In
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {/* View on Map Button */}
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
                    className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 text-[#666] hover:bg-[#f5f5f5] transition-colors"
                    aria-label="View on Map"
                    type="button"
                  >
                    <svg
                      className="w-4 h-4"
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
                  {/* Share Button */}
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
                    className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 text-[#666] hover:bg-[#f5f5f5] transition-colors"
                    aria-label="Share Location"
                    type="button"
                  >
                    <svg
                      className="w-4 h-4"
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

            <div
              className={`flex-1 relative ${checkInSuccess ? 'overflow-hidden' : 'overflow-y-auto'}`}
            >
              {!checkInSuccess ? (
                <>
                  {/* Location Header with Image */}
                  {checkInTarget && (
                    <div className="flex items-center gap-3 p-3 bg-[#fafafa] border-b border-[#f0f0f0]">
                      {checkInTarget.imageUrl ? (
                        <img
                          src={checkInTarget.imageUrl}
                          alt={checkInTarget.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8e8e8] to-[#d0d0d0] flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-[#999]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-inktrap text-[13px] leading-tight tracking-[-0.3px] text-[#1a1a1a] line-clamp-1">
                          {checkInTarget?.display_name || 'Selected Location'}
                        </h3>
                        <p className="font-inktrap text-[10px] uppercase tracking-[0.3px] text-[#999] mt-0.5 line-clamp-1">
                          {checkInTarget?.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Form Content */}
                  <div className="p-3">
                    <div className="flex flex-col gap-4">
                      {/* Check-ins Section */}
                      <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-inktrap uppercase tracking-[0.3px] text-[#999]">
                            Check-ins
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              {locationCheckins.length > 0 ? (
                                locationCheckins.slice(0, 2).map((entry) => (
                                  <div
                                    key={`badge-${entry.id}`}
                                    className="size-6 rounded-full border-2 border-white bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shadow-sm"
                                  >
                                    {getCheckinInitial(entry)}
                                  </div>
                                ))
                              ) : (
                                <div className="size-6 rounded-full border-2 border-white bg-[#e8e8e8] text-[10px] font-semibold text-[#999] flex items-center justify-center">
                                  +
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-inktrap text-[#999]">
                              {locationCheckins.length > 0
                                ? `+${Math.max(locationCheckins.length - 2, 0)}`
                                : 'Be first'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 overflow-y-auto max-h-[180px]">
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
                                className="rounded-xl bg-[#f8f8f8] p-2.5"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shrink-0">
                                    {getCheckinInitial(entry)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium text-[#1a1a1a] truncate">
                                        {getCheckinDisplayName(entry)}
                                      </span>
                                      <span className="text-[9px] text-[#b5b5b5] shrink-0">
                                        {formatCheckinTimestamp(
                                          entry.createdAt
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-snug text-[#666] mt-0.5 line-clamp-2">
                                      {entry.comment}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      {/* Comment Input */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="checkInComment"
                          className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                        >
                          Your Comment <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          id="checkInComment"
                          value={checkInComment}
                          onChange={(e) => setCheckInComment(e.target.value)}
                          placeholder="Share why this place is worth visiting..."
                          className="min-h-[80px] rounded-xl p-3 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999] resize-none"
                          maxLength={500}
                          disabled={isCheckingIn}
                        />
                      </div>
                    </div>
                  </div>
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
                              values="0 0 0 0 0.4 0 0 0 0 0.835294 0 0 0 0 0.458824 0 0 0 1 0"
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
              <div className="p-3 pt-0">
                <div className="flex w-full gap-2">
                  <button
                    onClick={handleCloseCheckInModal}
                    className="bg-[#f0f0f0] hover:bg-[#e8e8e8] text-[#666] rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex-1 disabled:opacity-50 transition-colors flex items-center justify-center"
                    disabled={isCheckingIn}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCheckIn}
                    disabled={
                      isCheckingIn || !checkInTarget || !checkInComment.trim()
                    }
                    className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors disabled:opacity-50 flex-1"
                    type="button"
                  >
                    {isCheckingIn ? '...' : 'Check In'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <button
                  onClick={handleCloseCheckInModal}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Form Dialog */}
      <Dialog
        open={showLocationForm}
        onOpenChange={(open) => {
          if (!open) handleCloseLocationForm();
        }}
      >
        <DialogContent className="w-full max-w-[340px] p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <div className="bg-white rounded-2xl overflow-hidden max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            {/* Header */}
            {formStep !== 'success' && (
              <div className="bg-white flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseLocationForm}
                    className="text-[#999] hover:text-[#666] transition-colors disabled:opacity-50"
                    aria-label="Close"
                    disabled={isCreatingLocation}
                  >
                    <svg
                      className="w-5 h-5"
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
                  <h2 className="text-sm font-inktrap text-[#1a1a1a] tracking-[-0.5px]">
                    New Location
                  </h2>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
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
              <div className="p-3 pt-0">
                <button
                  onClick={handleBusinessDetailsNext}
                  disabled={isCreatingLocation}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors disabled:opacity-50 w-full"
                >
                  {isCreatingLocation ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            ) : (
              <div className="p-3">
                <button
                  onClick={handleCloseLocationForm}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
