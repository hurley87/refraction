"use client";

import { useState, useRef, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import LocationSearch from "@/components/location-search";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MapNav from "@/components/mapnav";

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
  description: string;
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
    description: "",
  });

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
            description: newMarker.display_name,
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
        description: newMarker.display_name,
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
    const { longitude, latitude } = picked;
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
    }
  };

  const handleMarkerClick = (marker: MarkerData) => {
    setPopupInfo(marker);
    setSelectedMarker(marker);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Create location and award points
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place_id: selectedMarker.place_id,
          display_name: formData.description || selectedMarker.display_name,
          name: formData.name,
          lat: selectedMarker.latitude.toString(),
          lon: selectedMarker.longitude.toString(),
          type: "location",
          walletAddress: walletAddress,
          username: userUsername,
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
        display_name: formData.description || selectedMarker.display_name,
        creator_wallet_address: walletAddress,
        creator_username: userUsername,
      };

      setMarkers((current) => [...current, newPermanentMarker]);

      toast.success(
        `Location created successfully! You earned ${result.pointsAwarded || 100} points!`,
      );

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
    setFormData({ name: "", description: "" });
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
        <div className="w-full">
          <div className="bg-[var(--UI-White-65,rgba(255,255,255,0.65))] border border-[var(--UI-White-65,rgba(255,255,255,0.65))] rounded-3xl p-3 md:p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]">
            <LocationSearch
              placeholder="Search places, addresses, or POIs"
              proximity={{
                longitude: viewState.longitude,
                latitude: viewState.latitude,
              }}
              onSelect={handleSearchSelect}
            />
          </div>
        </div>
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

        {/* Popup */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.latitude}
            longitude={popupInfo.longitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="z-50"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg p-3">
              <h3 className="text-base font-semibold text-black whitespace-normal break-words leading-tight mb-2">
                {popupInfo.name}
              </h3>
              <div className="flex items-center gap-1 text-[10px] tracking-wide uppercase text-gray-500">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="whitespace-normal break-words leading-tight">
                  {popupInfo.display_name}
                </span>
              </div>
              {popupInfo.creator_username && (
                <div className="mt-2 text-xs text-gray-600">
                  Created by: {popupInfo.creator_username}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Location Form Dialog */}
      <Dialog
        open={showLocationForm}
        onOpenChange={(open) => {
          if (!open) handleCloseLocationForm();
        }}
      >
        <DialogContent className="w-full max-w-md p-0 sm:rounded-2xl">
          <div className="bg-white rounded-2xl p-4 sm:p-6 pb-6 w-full mx-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-inktrap font-bold text-black">
                Add New Location
              </h2>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4">
              {/* Location Name */}
              <div>
                <Label
                  htmlFor="name"
                  className="text-sm font-inktrap text-gray-700"
                >
                  Location Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Central Park"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1"
                  disabled={isCreatingLocation}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-inktrap text-gray-700"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe this location..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-1 min-h-[80px]"
                  disabled={isCreatingLocation}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  You&apos;ll earn <strong>100 points</strong> for adding this
                  location!
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 pb-24 md:pb-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseLocationForm}
                  className="flex-1 h-16 rounded-full text-base"
                  size="lg"
                  disabled={isCreatingLocation}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-16 rounded-full text-base bg-black text-white hover:bg-black/90"
                  size="lg"
                  disabled={isCreatingLocation}
                >
                  {isCreatingLocation ? "Creating..." : "Add Location"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
