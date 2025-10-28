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
}

interface LocationFormData {
  name: string;
  address: string;
  description: string;
  locationImage: File | null;
  checkInComment: string;
  checkInImage: File | null;
}

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
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    description: "",
    locationImage: null,
    checkInComment: "",
    checkInImage: null,
  });
  const [searchedLocation, setSearchedLocation] =
    useState<SearchLocationData | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

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
            checkInImage: null,
          });
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
        checkInImage: null,
      });
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

  const handleCheckIn = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet to check in");
      return;
    }

    const locationToCheckIn = popupInfo || searchedLocation;
    if (!locationToCheckIn) return;

    setIsCheckingIn(true);

    try {
      // Determine display name based on type
      let displayName: string;
      if (popupInfo) {
        displayName = popupInfo.display_name;
      } else if (searchedLocation) {
        displayName = searchedLocation.display_name;
      } else {
        displayName = "";
      }

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
            place_id: locationToCheckIn.place_id,
            display_name: displayName,
            name: locationToCheckIn.name,
            lat: locationToCheckIn.latitude.toString(),
            lon: locationToCheckIn.longitude.toString(),
            type: "location",
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info("You've already checked in at this location!");
          setPopupInfo(null);
          setSearchedLocation(null);
          return;
        }
        throw new Error(result.error || "Failed to check in");
      }

      toast.success(
        `Check-in successful! You earned ${result.pointsEarned || 100} points!`,
      );

      // Close the popups
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
      checkInImage: null,
    });
    setShowLocationForm(true);
  };

  const handleCreateLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedMarker || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Location name is required");
      return;
    }

    setIsCreatingLocation(true);

    try {
      // Upload images if they exist
      let locationImageUrl = "";
      let checkInImageUrl = "";

      if (formData.locationImage) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", formData.locationImage);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          locationImageUrl = uploadResult.url;
        }
      }

      if (formData.checkInImage) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", formData.checkInImage);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          checkInImageUrl = uploadResult.url;
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
      };

      setMarkers((current) => [...current, newPermanentMarker]);

      // If user provided a check-in comment, check them in
      if (formData.checkInComment.trim()) {
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
              comment: formData.checkInComment,
              imageUrl: checkInImageUrl,
            }),
          });

          const checkInResult = await checkInResponse.json();

          if (checkInResponse.ok) {
            toast.success(
              `Location created and check-in successful! You earned ${(result.pointsAwarded || 100) + (checkInResult.pointsEarned || 0)} points!`,
            );
          } else {
            toast.success(
              `Location created successfully! You earned ${result.pointsAwarded || 100} points!`,
            );
          }
        } catch (checkInError) {
          // If check-in fails, just log it but don't fail the whole operation
          console.error("Check-in failed:", checkInError);
          toast.success(
            `Location created successfully! You earned ${result.pointsAwarded || 100} points!`,
          );
        }
      } else {
        toast.success(
          `Location created successfully! You earned ${result.pointsAwarded || 100} points!`,
        );
      }

      handleCloseLocationForm();
    } catch (error) {
      console.error("Error creating location:", error);
      toast.error("Failed to create location: " + (error as Error).message);
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleCloseLocationForm = () => {
    setShowLocationForm(false);
    setSelectedMarker(null);
    setPopupInfo(null);
    setFormData({
      name: "",
      address: "",
      description: "",
      locationImage: null,
      checkInComment: "",
      checkInImage: null,
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
                className={`w-5 h-5 rounded-full border-2 shadow-md ${
                  selectedMarker?.place_id === marker.place_id
                    ? "bg-green-500 border-white"
                    : "bg-blue-500 border-white"
                }`}
              />
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
              onAction={handleCheckIn}
              onClose={() => {
                setPopupInfo(null);
                setSelectedMarker(null);
              }}
              isLoading={isCheckingIn}
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
            <div className="w-5 h-5 rounded-full border-2 shadow-md bg-gray-400 border-white" />
          </Marker>
        )}
      </Map>

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
                onClick={handleCloseLocationForm}
                className="bg-[#ededed] cursor-pointer flex items-center justify-center p-1 rounded-full size-8 hover:bg-[#e0e0e0] transition-colors"
                aria-label="Back"
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
                Create & Check In
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleCreateLocation} className="flex flex-col">
                {/* Add Business Details Section */}
                <div>
                  <div className="p-5">
                    <div className="flex flex-col gap-4">
                      {/* Name Field */}
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="name"
                          className="text-[11px] font-medium text-[#7d7d7d] uppercase tracking-[0.44px]"
                        >
                          Name
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
                          className="border-[#7d7d7d] rounded-full px-4 py-4 h-auto"
                          disabled={isCreatingLocation}
                          maxLength={100}
                        />
                      </div>

                      {/* Address Field */}
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="address"
                          className="text-[11px] font-medium text-[#7d7d7d] uppercase tracking-[0.44px]"
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
                          className="bg-[#ededed] border-[#ededed] rounded-full px-4 py-4 h-auto"
                          disabled={isCreatingLocation}
                          maxLength={200}
                        />
                      </div>

                      {/* Description Field */}
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="description"
                          className="text-[11px] font-medium text-[#7d7d7d] uppercase tracking-[0.44px]"
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
                          className="min-h-[100px] rounded-2xl px-4 py-3 border-[#7d7d7d]"
                          disabled={isCreatingLocation}
                          maxLength={500}
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-medium text-[#7d7d7d] uppercase tracking-[0.44px]">
                          Image
                        </label>
                        <label
                          htmlFor="locationImage"
                          className="bg-[#ededed] border border-[#b5b5b5] border-dashed rounded-2xl flex flex-col items-center justify-center px-10 py-4 cursor-pointer hover:bg-[#e0e0e0] transition-colors"
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
                          disabled={isCreatingLocation}
                        />
                        {formData.locationImage && (
                          <p className="text-xs text-[#7d7d7d]">
                            {formData.locationImage.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Gradient with Submit Button */}
            <div className="bg-gradient-to-b from-[rgba(255,255,255,0)] to-white via-white/[48.07%] border-t border-[#ededed] p-4">
              <div className="flex w-full justify-between gap-4">
                <button
                  onClick={handleCloseLocationForm}
                  className="bg-[#ededed] hover:bg-[#e0e0e0] text-[#7d7d7d] rounded-full px-4 py-2 h-auto font-inktrap text-base tracking-[-1.28px] w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateLocation}
                  disabled={isCreatingLocation}
                  className="bg-[#313131] hover:bg-[#424242] text-[#ededed] rounded-full h-10 font-inktrap text-base leading-4 flex items-center justify-center transition-colors disabled:opacity-50 whitespace-nowrap w-full"
                >
                  {isCreatingLocation ? "Creating..." : "Check In"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
