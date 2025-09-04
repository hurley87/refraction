"use client";

import { useState, useRef, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationGame } from "@/hooks/useLocationGame";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
}

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  name?: string;
  context?: string;
}

export default function InteractiveMap() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { performCheckin, isCheckinLoading } = useLocationGame();

  const [viewState, setViewState] = useState({
    longitude: -73.9442,
    latitude: 40.7081,
    zoom: 12,
  });

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSuggestions] = useState<LocationSuggestion[]>(
    [],
  );
  const [isHowToOpen, setIsHowToOpen] = useState(true);

  const mapRef = useRef<any>(null);

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

  // Disable adding markers by clicking the map. Clicking markers opens existing details.

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/geocode-mapbox?q=${encodeURIComponent(searchQuery)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSuggestions([]);
    }
  };

  const handleSelectSearchResult = (location: LocationSuggestion) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    // Fly to the location
    setViewState({
      longitude: lon,
      latitude: lat,
      zoom: 15,
    });

    // Try to select nearest existing marker rather than creating a new one
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
      const d = distanceMeters(lat, lon, m.latitude, m.longitude);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = m;
      }
    }

    // If an existing marker is within 100m, open it; otherwise just pan without creating
    if (nearest && nearestDist <= 100) {
      setSelectedMarker(nearest);
      setPopupInfo(nearest);
    }

    setSearchQuery("");
    setSuggestions([]);
  };

  const handleMarkerClick = (marker: MarkerData) => {
    setPopupInfo(marker);
    setSelectedMarker(marker);
  };

  const handleCheckin = async () => {
    if (!selectedMarker || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }

    const locationData = {
      place_id: selectedMarker.place_id,
      display_name: selectedMarker.display_name,
      name: selectedMarker.name,
      lat: selectedMarker.latitude.toString(),
      lon: selectedMarker.longitude.toString(),
      type: "location",
    };

    const result = await performCheckin({
      walletAddress,
      locationData,
    });

    if (result?.success) {
      // Remove the marker after successful checkin
      setMarkers((current) =>
        current.filter((m) => m.place_id !== selectedMarker.place_id),
      );
      setSelectedMarker(null);
      setPopupInfo(null);
      toast.success(
        `Checked in successfully! Earned ${result.pointsEarned} points!`,
      );
    }
  };

  // Clearing markers disabled since markers come from DB

  return (
    <div className="w-full h-full relative">
      {/* Search Controls + How To */}
      <div className="absolute top-4 left-4 right-4 z-10 space-y-2 max-w-xl">
        <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg">
          <div className="flex gap-2 items-center mb-2">
            <Input
              placeholder="Search for locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-full px-4"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
            >
              <Search className="w-4 h-4 text-white" />
            </Button>
          </div>

          {/* Search Results */}
          {searchSuggestions.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-2 hover:bg-gray-50 cursor-pointer rounded-lg text-sm"
                  onClick={() => handleSelectSearchResult(suggestion)}
                >
                  {suggestion.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        {selectedMarker && (
          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg">
            <div className="flex gap-2">
              <Button
                onClick={handleCheckin}
                disabled={!walletAddress || isCheckinLoading}
                className="flex-1 bg-green-500 hover:bg-green-600"
                size="sm"
              >
                {isCheckinLoading ? "Checking in..." : "Check In"}
              </Button>
            </div>
          </div>
        )}

        {/* How To under search (collapsible) */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg">
          <button
            onClick={() => setIsHowToOpen((v) => !v)}
            className="w-full flex items-center justify-between text-sm px-1 py-1"
          >
            <span className="font-semibold">How to use</span>
            <span className="ml-3 text-xs opacity-80">
              {isHowToOpen ? "Hide" : "Show"}
            </span>
          </button>
          {isHowToOpen && (
            <div className="pt-2 text-sm space-y-1">
              <p>• Search for locations using the search bar</p>
              <p>• Tap existing markers to view details</p>
              <p>• Press Check In in the popup to earn points</p>
              <p>• Each unique location check-in earns 100 points</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ position: "absolute", inset: 0 }}
        cursor="crosshair"
      >
        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
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
                    : "bg-red-500 border-white"
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
            <div className="p-2 min-w-48">
              <h3 className="font-semibold text-sm">{popupInfo.name}</h3>
              <p className="text-xs text-gray-600 mt-1">
                {popupInfo.display_name}
              </p>
              {(popupInfo.creator_username ||
                popupInfo.creator_wallet_address) && (
                <p className="text-xs text-gray-500 mt-1">
                  Created by{" "}
                  {popupInfo.creator_username ||
                    popupInfo.creator_wallet_address}
                </p>
              )}
              <Button
                onClick={handleCheckin}
                disabled={!walletAddress || isCheckinLoading}
                className="w-full mt-2 bg-green-500 hover:bg-green-600 text-xs py-1"
                size="sm"
              >
                {isCheckinLoading ? "Checking in..." : "Check In Here"}
              </Button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Bottom overlay removed per request */}
    </div>
  );
}
