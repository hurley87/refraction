"use client";

import { useState, useRef, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationGame } from "@/hooks/useLocationGame";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import MobileFooterNav from "@/components/mobile-footer-nav";
import CoinLocationForm, { CoinFormData } from "./coin-location-form";
import {
  createMetadataBuilder,
  createZoraUploaderForCreator,
  setApiKey,
} from "@zoralabs/coins-sdk";
// Supabase is server-only; do not import it in client components.

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  coin_address?: string | null;
  coin_name?: string | null;
  coin_symbol?: string | null;
  coin_image_url?: string | null;
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
  const [tempMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSuggestions] = useState<LocationSuggestion[]>(
    [],
  );
  const [isHowToOpen, setIsHowToOpen] = useState(true);
  const [showCoinForm, setShowCoinForm] = useState(false);
  const [isCreatingCoin, setIsCreatingCoin] = useState(false);
  const [coinCreationSuccess, setCoinCreationSuccess] = useState(false);
  const [createdCoinData, setCreatedCoinData] = useState<{
    address: string;
    transactionHash: string;
  } | null>(null);

  const mapRef = useRef<any>(null);

  // Initialize Zora SDK API key
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY as string | undefined;
    if (apiKey) {
      setApiKey(apiKey);
    } else {
      console.warn("NEXT_PUBLIC_ZORA_API_KEY is not set");
    }
  }, []);

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
            coin_address: loc.coin_address ?? null,
            coin_name: loc.coin_name ?? null,
            coin_symbol: loc.coin_symbol ?? null,
            coin_image_url: loc.coin_image_url ?? null,
          }),
        );
        setMarkers(dbMarkers);
      } catch (e) {
        console.error("Failed to load locations:", e);
      }
    };
    loadMarkers();
  }, []);

  // Add markers by clicking the map for coin creation
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

          // Do not render a temp marker. Open the create coin form directly.
          setSelectedMarker(newMarker);
          setShowCoinForm(true);
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

      // Do not render a temp marker. Open the create coin form directly.
      setSelectedMarker(newMarker);
      setShowCoinForm(true);
    }
  };

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

  // Function to upload coin image via server API (Supabase usage is server-side only)
  const uploadCoinImage = async (
    imageFile: File,
    coinAddress: string,
    walletAddress: string,
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("coinAddress", coinAddress);
      formData.append("walletAddress", walletAddress);

      const res = await fetch("/api/coin-images/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      return (json.publicUrl as string) ?? null;
    } catch (error) {
      console.error("Error uploading coin image:", error);
      return null;
    }
  };

  const handleCreateLocationWithCoin = async (coinFormData: CoinFormData) => {
    if (!selectedMarker || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }

    setIsCreatingCoin(true);

    try {
      // Ensure we always pass a File to withImage
      let imageFile: File;
      if (coinFormData.image) {
        imageFile = coinFormData.image;
      } else {
        const placeholderUrl =
          "https://via.placeholder.com/300x300?text=Location+Coin";
        const resp = await fetch(placeholderUrl);
        const blob = await resp.blob();
        imageFile = new File([blob], "placeholder.png", {
          type: blob.type || "image/png",
        });
      }

      // Create metadata on frontend (with proper File handling)
      const { createMetadataParameters } = await createMetadataBuilder()
        .withName(coinFormData.name)
        .withSymbol(coinFormData.symbol)
        .withDescription(coinFormData.description)
        .withImage(imageFile)
        .upload(createZoraUploaderForCreator(walletAddress as `0x${string}`));

      console.log("Metadata created on frontend:", createMetadataParameters);

      // Upload coin image for UI display if provided
      let coinImageUrl: string | null = null;
      if (coinFormData.image) {
        coinImageUrl = await uploadCoinImage(
          coinFormData.image,
          "temp-" + Date.now(), // Temporary ID for upload
          walletAddress,
        );
      }

      // Prepare data for server-side coin creation (with metadata)
      const locationData = {
        place_id: selectedMarker.place_id,
        display_name: selectedMarker.display_name,
        name: selectedMarker.name,
        lat: selectedMarker.latitude.toString(),
        lon: selectedMarker.longitude.toString(),
        type: "location",
        coinName: coinFormData.name,
        coinSymbol: coinFormData.symbol,
        coinDescription: coinFormData.description,
        coinImageUrl: coinImageUrl,
        userWalletAddress: walletAddress,
        username: null,
        metadata: createMetadataParameters.metadata, // Pass metadata to server
      };

      console.log("Creating location with coin on server:", locationData);

      // Call server endpoint to create coin and save location
      const response = await fetch("/api/locations/create-with-coin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create location with coin");
      }

      console.log("Server response:", result);

      // Create new marker for the map
      const newPermanentMarker: MarkerData = {
        ...selectedMarker,
        creator_wallet_address: walletAddress,
        creator_username: null,
        coin_address: result.coin.address,
        coin_name: coinFormData.name,
        coin_symbol: coinFormData.symbol,
        coin_image_url: coinImageUrl,
      };

      setMarkers((current) => [...current, newPermanentMarker]);

      // Set success state
      setCoinCreationSuccess(true);
      setCreatedCoinData({
        address: result.coin.address,
        transactionHash: result.coin.transactionHash,
      });

      toast.success(`Coin created successfully: ${coinFormData.symbol}`);
    } catch (error) {
      console.error("Error creating coin location:", error);
      toast.error(
        "Failed to create coin location: " + (error as Error).message,
      );
    } finally {
      setIsCreatingCoin(false);
    }
  };

  const handleShowCoinForm = () => {
    if (!selectedMarker || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }
    setShowCoinForm(true);
    setCoinCreationSuccess(false);
    setCreatedCoinData(null);
  };

  const handleCloseCoinForm = () => {
    setShowCoinForm(false);
    setCoinCreationSuccess(false);
    setCreatedCoinData(null);
    setSelectedMarker(null);
    setPopupInfo(null);
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

  return (
    <div className="w-full h-full relative">
      {/* Search Controls + How To */}
      <div className="absolute top-4 left-4 right-4 z-10 space-y-2 max-w-xl">
        <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-3 md:p-4 shadow-xl">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search for locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-11 md:h-12 rounded-full bg-white/70 dark:bg-zinc-900/60 border border-transparent px-4 text-sm placeholder:text-zinc-400 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-blue-600 hover:bg-blue-700 p-0 shadow-md"
            >
              <Search className="w-5 h-5 text-white" />
            </Button>
          </div>

          {/* Search Results */}
          {searchSuggestions.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-black/5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-1 shadow-lg">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer rounded-lg text-sm"
                  onClick={() => handleSelectSearchResult(suggestion)}
                >
                  {suggestion.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How To under search (collapsible) */}
        <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-xl">
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
              <p>
                • <strong>Search:</strong> Use the search bar to find locations
              </p>
              <p>
                • <strong>Click Map:</strong> Click anywhere to create new
                locations
              </p>
              <p>
                • <strong>Markers:</strong> Click to check in
              </p>
              <p>
                • <strong>Coins:</strong> Each location has its own Zora coin!
              </p>
            </div>
          )}
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

        {/* Temporary Markers (new locations to be created) */}
        {tempMarkers.map((marker, index) => (
          <Marker
            key={`temp-${index}`}
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
              aria-label={`New location at ${marker.name}`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 shadow-lg ${
                  selectedMarker?.place_id === marker.place_id
                    ? "bg-yellow-500 border-white animate-pulse"
                    : "bg-orange-500 border-white"
                }`}
              >
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  +
                </div>
              </div>
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
            <div className="p-3 min-w-64 max-w-80">
              {/* Coin Information */}
              {popupInfo.coin_address && (
                <div className="mb-3 border-b pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    {popupInfo.coin_image_url && (
                      <img
                        src={popupInfo.coin_image_url}
                        alt={popupInfo.coin_name || "Coin"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">
                        {popupInfo.coin_name} ({popupInfo.coin_symbol})
                      </h3>
                      <p className="text-xs text-gray-500 font-mono break-all">
                        {popupInfo.coin_address.slice(0, 6)}...
                        {popupInfo.coin_address.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Information */}
              <div className="mb-3">
                <h4 className="font-semibold text-sm">{popupInfo.name}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {popupInfo.display_name}
                </p>
                {(popupInfo.creator_username ||
                  popupInfo.creator_wallet_address) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Created by{" "}
                    {popupInfo.creator_username ||
                      `${popupInfo.creator_wallet_address?.slice(0, 6)}...${popupInfo.creator_wallet_address?.slice(-4)}`}
                  </p>
                )}
              </div>

              {/* Different buttons for temp vs permanent markers */}
              {tempMarkers.find((m) => m.place_id === popupInfo.place_id) ? (
                // This is a temporary marker - show coin location option
                <Button
                  onClick={handleShowCoinForm}
                  disabled={!walletAddress || isCreatingCoin}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-xs py-2 flex items-center justify-center gap-1"
                  size="sm"
                >
                  <Coins className="w-3 h-3" />
                  {isCreatingCoin ? "Creating..." : "Coin Location"}
                </Button>
              ) : (
                // This is a permanent marker - show check in option
                <Button
                  onClick={handleCheckin}
                  disabled={!walletAddress || isCheckinLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-xs py-1"
                  size="sm"
                >
                  {isCheckinLoading ? "Checking in..." : "Check In Here"}
                </Button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Coin Form Modal */}
      {showCoinForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4 md:pb-28 overflow-y-auto">
          <div className="w-full h-full md:h-auto md:max-w-md md:my-8">
            <CoinLocationForm
              locationName={selectedMarker?.name}
              locationAddress={selectedMarker?.display_name}
              onSubmit={handleCreateLocationWithCoin}
              onCancel={handleCloseCoinForm}
              isLoading={isCreatingCoin}
              isSuccess={coinCreationSuccess}
              coinAddress={createdCoinData?.address}
              transactionHash={createdCoinData?.transactionHash}
            />
          </div>
        </div>
      )}

      {/* Mobile nav on all screens for this page */}
      <MobileFooterNav showOnDesktop />
    </div>
  );
}
