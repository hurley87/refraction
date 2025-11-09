"use client";

import { useState, useRef, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import LocationSearch from "@/components/location-search";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MapNav from "@/components/mapnav";
import MapCard from "@/components/map-card";

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
}

interface LocationFormData {
  name: string;
  address: string;
  description: string;
  locationImage: File | null;
  checkInComment: string;
}

type FormStep = "business-details" | "checkin-details" | "success";

interface SearchLocationData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  placeFormatted?: string;
}

export default function InteractiveMap() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [userUsername, setUserUsername] = useState<string | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -73.9442,
    latitude: 40.7081,
    zoom: 12,
  });

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>("business-details");
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState({ creation: 0, checkIn: 0 });
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    description: "",
    locationImage: null,
    checkInComment: "",
  });
  const [searchedLocation, setSearchedLocation] =
    useState<SearchLocationData | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<MarkerData | null>(null);
  const [checkInComment, setCheckInComment] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInPointsEarned, setCheckInPointsEarned] = useState(0);

  const mapRef = useRef<any>(null);
  const hasSetInitialLocationRef = useRef(false);

  // Center map on user's current location once on mount (with fallback)
  useEffect(() => {
    if (hasSetInitialLocationRef.current) return;
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        hasSetInitialLocationRef.current = true;
        const { latitude, longitude } = position.coords;
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: Math.max(prev.zoom ?? 12, 14),
        }));
      },
      (error) => {
        console.warn("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  // Fetch user's username from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (walletAddress) {
        try {
          const response = await fetch(
            `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`,
          );
          if (response.ok) {
            const result = await response.json();
            if (result.player?.username) {
              setUserUsername(result.player.username);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, [walletAddress]);

  // Load markers from DB on mount
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const response = await fetch("/api/locations");
        if (!response.ok) return;
        const data = await response.json();
        const dbMarkers: MarkerData[] = (data.locations || []).map(
          (loc: any) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            place_id: loc.place_id,
            display_name: loc.display_name,
            name: loc.name,
            creator_wallet_address: loc.creator_wallet_address ?? null,
            creator_username: loc.creator_username ?? null,
            imageUrl: loc.coin_image_url ?? null,
          }),
        );
        setMarkers(dbMarkers);
      } catch (e) {
        console.error("Failed to load locations:", e);
      }
    };
    loadMarkers();
  }, []);

  // Add markers by clicking the map
  const onMapClick = async (event: any) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet to create locations");
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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=poi,place,address`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const newMarker: MarkerData = {
            latitude,
            longitude,
            place_id: feature.id || `temp-${Date.now()}`,
            display_name: feature.place_name || "Unknown Location",
            name: feature.text || "New Location",
          };

          setSelectedMarker(newMarker);
          setFormData({
            name: newMarker.name,
            address: newMarker.display_name,
            description: "",
            locationImage: null,
            checkInComment: "",
          });
          setFormStep("business-details");
          setShowLocationForm(true);
        }
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      // Still allow creating even if reverse geocoding fails
      const newMarker: MarkerData = {
        latitude,
        longitude,
        place_id: `temp-${Date.now()}`,
        display_name: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        name: "New Location",
      };

      setSelectedMarker(newMarker);
      setFormData({
        name: newMarker.name,
        address: newMarker.display_name,
        description: "",
        locationImage: null,
        checkInComment: "",
      });
      setFormStep("business-details");
      setShowLocationForm(true);
    }
  };

  const handleSearchSelect = (picked: {
    longitude: number;
    latitude: number;
    id: string;
    name?: string;
    placeFormatted?: string;
  }) => {
    const { longitude, latitude, id, name, placeFormatted } = picked;
    setViewState({ longitude, latitude, zoom: 15 });

    // Open nearest existing marker if within 100m
    const toRad = (v: number) => (v * Math.PI) / 180;
    const earth = 6371000; // m
    const distanceMeters = (
      aLat: number,
      aLon: number,
      bLat: number,
      bLon: number,
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
      const searchLocation: SearchLocationData = {
        latitude,
        longitude,
        place_id: id,
        display_name: placeFormatted || name || "Unknown Location",
        name: name || "Unknown Location",
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

  const handleStartCheckIn = (marker: MarkerData) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet to check in");
      return;
    }

    setCheckInTarget(marker);
    setCheckInComment("");
    setShowCheckInModal(true);
  };

  const handleCloseCheckInModal = () => {
    setShowCheckInModal(false);
    setCheckInComment("");
    setCheckInTarget(null);
    setCheckInSuccess(false);
    setCheckInPointsEarned(0);
  };

  const handleCheckIn = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet to check in");
      return;
    }

    if (!checkInTarget) {
      toast.error("Select a location before checking in");
      return;
    }

    setIsCheckingIn(true);

    try {
      const response = await fetch("/api/location-checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
            type: "location",
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
        throw new Error(result.error || "Failed to check in");
      }

      // Show success screen
      setCheckInPointsEarned(result.pointsEarned || 100);
      setCheckInSuccess(true);

      // Close the map popups
      setPopupInfo(null);
      setSearchedLocation(null);
      setSelectedMarker(null);
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in: " + (error as Error).message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleInitiateLocationCreation = async () => {
    if (!searchedLocation) return;

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
      name: searchedLocation.name,
      address: searchedLocation.display_name,
      description: "",
      locationImage: null,
      checkInComment: "",
    });
    setFormStep("business-details");
    setShowLocationForm(true);
  };

  const handleBusinessDetailsNext = () => {
    if (!formData.name.trim()) {
      toast.error("Location name is required");
      return;
    }

    if (!formData.locationImage) {
      toast.error("Location image is required");
      return;
    }

    setFormStep("checkin-details");
  };

  const handleCreateLocation = async () => {
    if (!selectedMarker || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }

    setIsCreatingLocation(true);

    try {
      // Upload location image
      let locationImageUrl = "";

      if (formData.locationImage) {
        // Convert file to base64
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.locationImage!);
        });

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || "",
            base64Image: base64Image,
          }),
        });

        if (!uploadResponse.ok) {
          const errorResult = await uploadResponse.json().catch(() => ({}));
          throw new Error(
            errorResult.error ||
              "Failed to upload location image. Please try again.",
          );
        }
        const uploadResult = await uploadResponse.json();
        locationImageUrl = uploadResult.imageUrl;
        if (!locationImageUrl) {
          throw new Error("Image upload succeeded but no URL was returned");
        }
      }

      // Create location and award points
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place_id: selectedMarker.place_id,
          display_name: formData.address || selectedMarker.display_name,
          name: formData.name,
          description: formData.description,
          lat: selectedMarker.latitude.toString(),
          lon: selectedMarker.longitude.toString(),
          type: "location",
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
              "You can only add one location per day. Come back tomorrow!",
          );
          handleCloseLocationForm();
          return;
        }
        throw new Error(result.error || "Failed to create location");
      }

      // Create new marker for the map
      const newPermanentMarker: MarkerData = {
        ...selectedMarker,
        name: formData.name,
        display_name: formData.address || selectedMarker.display_name,
        creator_wallet_address: walletAddress,
        creator_username: userUsername,
        imageUrl: locationImageUrl || null,
      };

      setMarkers((current) => [...current, newPermanentMarker]);

      const creationPoints = result.pointsAwarded || 100;
      let checkInPoints = 0;

      const trimmedComment = formData.checkInComment.trim();

      // If user provided a check-in comment, check them in
      if (trimmedComment) {
        try {
          const checkInResponse = await fetch("/api/location-checkin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              walletAddress,
              email: user?.email?.address,
              username: userUsername,
              locationData: {
                place_id: selectedMarker.place_id,
                display_name: formData.address || selectedMarker.display_name,
                name: formData.name,
                lat: selectedMarker.latitude.toString(),
                lon: selectedMarker.longitude.toString(),
                type: "location",
              },
              comment: trimmedComment,
            }),
          });

          const checkInResult = await checkInResponse.json();

          if (checkInResponse.ok) {
            checkInPoints = checkInResult.pointsEarned || 100;
          } else {
            // Check-in failed - inform the user but don't fail the location creation
            const errorMessage =
              checkInResult.error ||
              "Check-in failed. Location was created successfully.";
            toast.error(errorMessage);
            console.error("Check-in failed:", checkInResult);
          }
        } catch (checkInError) {
          // Network or parsing error
          console.error("Check-in failed:", checkInError);
          toast.error(
            "Check-in failed. Location was created successfully, but we couldn't complete your check-in.",
          );
        }
      }

      // Store points and show success screen
      setPointsEarned({ creation: creationPoints, checkIn: checkInPoints });
      setFormStep("success");
    } catch (error) {
      console.error("Error creating location:", error);
      toast.error("Failed to create location: " + (error as Error).message);
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleCloseLocationForm = () => {
    setShowLocationForm(false);
    setFormStep("business-details");
    setSelectedMarker(null);
    setPopupInfo(null);
    setPointsEarned({ creation: 0, checkIn: 0 });
    setFormData({
      name: "",
      address: "",
      description: "",
      locationImage: null,
      checkInComment: "",
    });
  };

  return (
    <div className="w-full h-full relative">
      {/* MapNav Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/20 to-transparent">
        <div className="max-w-md w-full mx-auto px-4 py-4">
          <MapNav />
        </div>
      </div>

      {/* Search Bar - Centered Below Header */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
        <LocationSearch
          placeholder="Search location"
          proximity={{
            longitude: viewState.longitude,
            latitude: viewState.latitude,
          }}
          onSelect={handleSearchSelect}
        />
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={onMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ position: "absolute", inset: 0 }}
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
                    ? "scale-110"
                    : ""
                }`}
                style={{ width: "51px", height: "65px" }}
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
                      width: "28px",
                      height: "28px",
                      top: "4px",
                      left: "50%",
                      transform: "translateX(-50%)",
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
              isExisting={true}
              onAction={() => handleStartCheckIn(popupInfo)}
              onClose={() => {
                setPopupInfo(null);
                setSelectedMarker(null);
              }}
              isLoading={isCheckingIn}
              imageUrl={popupInfo.imageUrl}
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
              name={searchedLocation.name}
              address={searchedLocation.display_name}
              isExisting={false}
              onAction={handleInitiateLocationCreation}
              onClose={() => setSearchedLocation(null)}
              isLoading={false}
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
      </Map>

      {/* Check-In Dialog */}
      <Dialog
        open={showCheckInModal}
        onOpenChange={(open) => {
          if (!open) handleCloseCheckInModal();
        }}
      >
        <DialogContent className="w-full max-w-md p-2 bg-transparent border-none shadow-none [&>button]:hidden">
          <div
            className={`rounded-3xl overflow-hidden max-h-[90vh] flex flex-col bg-white`}
          >
            {/* Header */}
            {!checkInSuccess && (
              <div className="bg-white flex items-center gap-4 px-4 py-3">
                <button
                  onClick={handleCloseCheckInModal}
                  className="bg-[#ededed] cursor-pointer flex items-center justify-center p-1 rounded-full size-8 hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
                  aria-label="Close"
                  disabled={isCheckingIn}
                >
                  <svg
                    className="w-4 h-4 text-[#b5b5b5]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h2 className="text-base font-inktrap text-[#313131] tracking-[-1.28px]">
                  Check In
                </h2>
              </div>
            )}

            <div
              className={`flex-1 relative ${checkInSuccess ? "overflow-hidden" : "overflow-y-auto"}`}
            >
              {!checkInSuccess ? (
                <>
                  {/* Map Preview */}
                  {checkInTarget && (
                    <div className="relative h-32 bg-gray-100">
                      <Map
                        longitude={checkInTarget.longitude}
                        latitude={checkInTarget.latitude}
                        zoom={14}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        mapboxAccessToken={
                          process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
                        }
                        style={{ width: "100%", height: "100%" }}
                        interactive={false}
                      >
                        <Marker
                          latitude={checkInTarget.latitude}
                          longitude={checkInTarget.longitude}
                          anchor="bottom"
                        >
                          <div
                            className="relative"
                            style={{ width: "51px", height: "65px" }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="51"
                              height="65"
                              viewBox="0 0 51 65"
                              fill="none"
                            >
                              <g filter="url(#filter0_d_7557_31214)">
                                <path
                                  d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                                  fill="white"
                                />
                              </g>
                            </svg>
                            {checkInTarget.imageUrl && (
                              <img
                                src={checkInTarget.imageUrl}
                                alt={checkInTarget.name}
                                className="absolute rounded-full object-cover"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  top: "4px",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              />
                            )}
                          </div>
                        </Marker>
                      </Map>
                    </div>
                  )}

                  {/* Form Content */}
                  <div className="px-[16px] py-[20px]">
                    <div className="mb-[16px]">
                      <h3 className="font-inktrap text-[16px] leading-[16px] tracking-[-1.28px] text-[#313131]">
                        {checkInTarget?.name || "Selected Location"}
                      </h3>
                      <p className="font-inktrap text-[11px] uppercase tracking-[0.44px] text-[#7d7d7d] mt-1">
                        {checkInTarget?.display_name}
                      </p>
                    </div>

                    <div className="flex flex-col gap-[8px]">
                      <label
                        htmlFor="checkInComment"
                        className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]"
                      >
                        Your Comment
                      </label>
                      <Textarea
                        id="checkInComment"
                        value={checkInComment}
                        onChange={(e) => setCheckInComment(e.target.value)}
                        placeholder="A little about this location and why they should visit"
                        className="min-h-[129px] rounded-[16px] p-[16px] border border-[#7d7d7d] bg-white text-[16px] leading-[22px] tracking-[-0.48px] text-[#313131] placeholder:text-[#b5b5b5] focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={500}
                        disabled={isCheckingIn}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Success Screen */
                <div
                  className="relative flex flex-col items-center justify-center min-h-[400px] w-full rounded-3xl overflow-hidden"
                  style={{
                    backgroundImage: "url('/city-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className="relative z-10 flex flex-col items-center gap-[28px] px-0 py-[109px] w-full h-full justify-center">
                    {/* Location Marker Icon */}
                    <div
                      className="relative shrink-0"
                      style={{ width: "46px", height: "66px" }}
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
                            width: "30px",
                            height: "30px",
                            top: "8px",
                            left: "8px",
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
                    <div className="flex flex-col gap-[16px] items-center w-full px-[16px] py-[12px]">
                      {/* Reward Section */}
                      <div className="flex flex-col gap-[8px] items-center w-full">
                        <div className="flex gap-[8px] items-center justify-center w-[134px]">
                          <div className="flex gap-[8px] items-center">
                            <div className="flex gap-[8px] items-center justify-center h-[14px] pt-[2px]">
                              <p
                                className="text-[11px] leading-[16px] text-white uppercase tracking-[0.44px] whitespace-pre"
                                style={{
                                  fontFamily:
                                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                                  fontWeight: 500,
                                }}
                              >
                                You Earned
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end justify-center gap-[8px] h-[53px] shadow-[0px_0px_10px_0px_rgba(255,255,255,0.54)]">
                          <div className="flex gap-[8px] items-center justify-center h-[53px]">
                            <p
                              className="text-[76px] leading-[0] text-white tracking-[-4.94px] whitespace-pre"
                              style={{
                                fontFamily:
                                  '"Pleasure Variable Trial", sans-serif',
                                fontWeight: 700,
                              }}
                            >
                              {checkInPointsEarned}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Checking In At Section */}
                      <div className="flex flex-col gap-[8px] items-center justify-between w-[183px] h-[47px]">
                        <p
                          className="text-[11px] leading-[16px] text-white uppercase tracking-[0.44px] whitespace-pre"
                          style={{
                            fontFamily:
                              '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          Checking In At
                        </p>
                        <div className="flex gap-[8px] items-end justify-end w-[121px]">
                          <div className="flex gap-[4px] items-center justify-center border border-white rounded-[1000px] pl-[8px] pr-[6px] py-[5px] min-h-px min-w-px">
                            <div className="overflow-clip relative shrink-0 w-4 h-4">
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
                            <div className="flex gap-[8px] items-center h-[14px] pt-[2px]">
                              <p
                                className="text-[11px] leading-[16px] text-white uppercase tracking-[0.44px] whitespace-pre"
                                style={{
                                  fontFamily:
                                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                                  fontWeight: 500,
                                }}
                              >
                                {checkInTarget?.name || "Location"}
                              </p>
                            </div>
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
              <div className="bg-gradient-to-b from-[rgba(255,255,255,0)] to-white via-white/[48.07%] p-4 pt-0">
                <div className="flex w-full justify-between gap-4">
                  <button
                    onClick={handleCloseCheckInModal}
                    className="bg-[#ededed] hover:bg-[#e0e0e0] text-[#7d7d7d] rounded-full px-4 py-2 h-auto font-inktrap text-base tracking-[-1.28px] w-full disabled:opacity-50"
                    disabled={isCheckingIn}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn || !checkInTarget}
                    className="bg-[#313131] hover:bg-[#424242] text-[#ededed] rounded-full h-10 font-inktrap text-base leading-4 flex items-center justify-center transition-colors disabled:opacity-50 whitespace-nowrap w-full"
                    type="button"
                  >
                    {isCheckingIn ? "Checking In..." : "Check In"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-transparent border-t border-white/20 p-4">
                <button
                  onClick={handleCloseCheckInModal}
                  className="bg-[#313131] hover:bg-[#424242] text-[#ededed] rounded-full h-10 font-inktrap text-base leading-4 flex items-center justify-center transition-colors w-full"
                >
                  Back to Map
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
        <DialogContent className="w-full max-w-md p-2 bg-transparent border-none shadow-none [&>button]:hidden">
          <div className="bg-white rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header with Back Button */}
            <div className="bg-white flex items-center gap-4 px-4 py-3">
              <button
                onClick={() => {
                  if (formStep === "checkin-details") {
                    setFormStep("business-details");
                  } else {
                    handleCloseLocationForm();
                  }
                }}
                className="bg-[#ededed] cursor-pointer flex items-center justify-center p-1 rounded-full size-8 hover:bg-[#e0e0e0] transition-colors"
                aria-label="Back"
                disabled={isCreatingLocation}
              >
                <svg
                  className="w-4 h-4 text-[#b5b5b5]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h2 className="text-base font-inktrap text-[#313131] tracking-[-1.28px]">
                {formStep === "business-details" && "Create & Check In"}
                {formStep === "checkin-details" && "Check In"}
                {formStep === "success" && "Check-In Successful"}
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Step 1: Business Details */}
              {formStep === "business-details" && (
                <div className="px-[16px] py-[20px]">
                  <div className="flex flex-col gap-[16px]">
                    {/* Name Field */}
                    <div className="flex flex-col gap-[8px]">
                      <label
                        htmlFor="name"
                        className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]"
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
                        className="rounded-[100px] p-[16px] border border-[#7d7d7d] bg-white text-[16px] leading-[22px] tracking-[-0.48px] text-[#313131] placeholder:text-[#b5b5b5] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                        maxLength={100}
                      />
                    </div>

                    {/* Address Field */}
                    <div className="flex flex-col gap-[8px]">
                      <label
                        htmlFor="address"
                        className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]"
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
                        className="rounded-[100px] p-[16px] border border-[#ededed] bg-[#ededed] text-[16px] leading-[22px] tracking-[-0.48px] text-[#7d7d7d] placeholder:text-[#7d7d7d] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                        maxLength={200}
                      />
                    </div>

                    {/* Description Field */}
                    <div className="flex flex-col gap-[8px]">
                      <label
                        htmlFor="description"
                        className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]"
                      >
                        Description
                      </label>
                      <Textarea
                        id="description"
                        placeholder="Add a description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="min-h-[129px] rounded-[16px] p-[16px] border border-[#7d7d7d] bg-white text-[16px] leading-[22px] tracking-[-0.48px] text-[#313131] placeholder:text-[#b5b5b5] focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={500}
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]">
                        Image <span className="text-red-500">*</span>
                      </label>
                      {formData.locationImage ? (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(formData.locationImage)}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-[16px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                locationImage: null,
                              }));
                            }}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 text-[#7d7d7d]"
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
                          <p className="text-xs text-[#7d7d7d] mt-2">
                            {formData.locationImage.name}
                          </p>
                        </div>
                      ) : (
                        <label
                          htmlFor="locationImage"
                          className="bg-[#ededed] border border-[#b5b5b5] border-dashed rounded-[16px] flex flex-col items-center justify-center px-[40px] py-[16px] cursor-pointer hover:bg-[#e0e0e0] transition-colors"
                        >
                          <svg
                            className="w-6 h-6 text-[#423333] mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-[11px] font-medium text-[#423333] uppercase tracking-[0.44px] text-center">
                            Upload an image
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

              {/* Step 2: Check-In Details */}
              {formStep === "checkin-details" && (
                <div className="px-[16px] py-[20px]">
                  <div className="mb-[16px]">
                    <h3 className="font-inktrap text-[16px] leading-[16px] tracking-[-1.28px] text-[#313131]">
                      {formData.name}
                    </h3>
                    <p className="font-inktrap text-[11px] uppercase tracking-[0.44px] text-[#7d7d7d] mt-1">
                      {formData.address}
                    </p>
                  </div>

                  <div className="flex flex-col gap-[8px]">
                    <label
                      htmlFor="checkInComment"
                      className="text-[11px] font-medium leading-[16px] text-[#7d7d7d] uppercase tracking-[0.44px]"
                    >
                      Your comment (optional)
                    </label>
                    <Textarea
                      id="checkInComment"
                      value={formData.checkInComment}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          checkInComment: e.target.value,
                        }))
                      }
                      placeholder="A little about this location and why they should visit"
                      className="min-h-[129px] rounded-[16px] p-[16px] border border-[#7d7d7d] bg-white text-[16px] leading-[22px] tracking-[-0.48px] text-[#313131] placeholder:text-[#b5b5b5] focus-visible:ring-0 focus-visible:ring-offset-0"
                      maxLength={500}
                      disabled={isCreatingLocation}
                    />
                    <div className="flex justify-between text-[10px] text-[#b5b5b5] font-inktrap">
                      <span>Keep it respectful.</span>
                      <span>{formData.checkInComment.length}/500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success Screen */}
              {formStep === "success" && (
                <div className="p-5 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-full max-w-sm text-center">
                    <div className="mb-8 bg-red-500">
                      <div className="text-6xl font-bold text-[#313131] mb-2 text-red-500">
                        {pointsEarned.creation + pointsEarned.checkIn}
                      </div>
                      <p className="text-sm text-[#7d7d7d] uppercase tracking-[0.44px]">
                        Points Earned
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 mb-6">
                      {pointsEarned.creation > 0 && (
                        <div className="flex items-center justify-between bg-[#ededed] rounded-full px-4 py-3">
                          <span className="text-sm font-inktrap text-[#313131]">
                            Created New Location
                          </span>
                          <span className="text-sm font-bold text-[#313131]">
                            +{pointsEarned.creation}
                          </span>
                        </div>
                      )}
                      {pointsEarned.checkIn > 0 && (
                        <div className="flex items-center justify-between bg-[#ededed] rounded-full px-4 py-3">
                          <span className="text-sm font-inktrap text-[#313131]">
                            Checked In
                          </span>
                          <span className="text-sm font-bold text-[#313131]">
                            +{pointsEarned.checkIn}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gradient with Button */}
            {formStep !== "success" && (
              <div className="bg-gradient-to-b from-[rgba(255,255,255,0)] to-white via-white/[48.07%] border-t border-[#ededed] p-4">
                <button
                  onClick={() => {
                    if (formStep === "business-details") {
                      handleBusinessDetailsNext();
                    } else if (formStep === "checkin-details") {
                      handleCreateLocation();
                    }
                  }}
                  disabled={isCreatingLocation}
                  className="bg-[#313131] hover:bg-[#424242] text-[#ededed] rounded-full h-10 font-inktrap text-base leading-4 flex items-center justify-center transition-colors disabled:opacity-50 w-full"
                >
                  {isCreatingLocation
                    ? "Creating..."
                    : formStep === "business-details"
                      ? "Next"
                      : "Check In"}
                </button>
              </div>
            )}

            {/* Success Screen Footer */}
            {formStep === "success" && (
              <div className="bg-gradient-to-b from-[rgba(255,255,255,0)] to-white via-white/[48.07%] border-t border-[#ededed] p-4">
                <button
                  onClick={handleCloseLocationForm}
                  className="bg-[#313131] hover:bg-[#424242] text-[#ededed] rounded-full h-10 font-inktrap text-base leading-4 flex items-center justify-center transition-colors w-full"
                >
                  Back to Map
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
