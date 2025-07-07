"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import Header from "./header";
import { useLocationGame } from "@/hooks/useLocationGame";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  name?: string;
  context?: string;
}

export default function GameMapbox() {
  const { user } = usePrivy();
  console.log("user", user);
  const walletAddress = user?.wallet?.address;
  const [query, setQuery] = useState("Williamsburg, NY");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState<LocationSuggestion | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const { performCheckin, isCheckinLoading } = useLocationGame();

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    // Use Mapbox Geocoding API
    fetch(`/api/geocode-mapbox?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setSuggestions(data))
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  const handleSelect = (loc: LocationSuggestion) => {
    setSelected(loc);
    setQuery(loc.display_name);
    setSuggestions([]);
    setConfirmed(false);
  };

  const handleCheckin = async () => {
    if (!selected || !walletAddress) {
      toast.error("Please select a location and connect your wallet");
      return;
    }

    const result = await performCheckin({
      walletAddress,
      locationData: selected,
    });

    if (result?.success) {
      setConfirmed(true);
      setPointsEarned(result.pointsEarned);
      setPlayerData(result.player);
    }
  };

  // Use Mapbox Static Images API
  const mapUrl = selected
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-marker+ff0000(${selected.lon},${selected.lat})/${selected.lon},${selected.lat},13,0/400x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
    : "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-73.9442,40.7081,12,0/400x300@2x?access_token=" +
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // If points are confirmed/earned, show the success screen
  if (confirmed) {
    return (
      <div
        style={{
          background:
            "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
        }}
        className="min-h-screen p-4 pb-0 font-grotesk"
      >
        <div className="min-h-screen max-w-lg mx-auto">
          {/* Status Bar */}
          <Header />

          {/* Main Content */}
          <div className="px-0 pt-8">
            {/* Success Title */}

            {/* Map thumbnail */}
            <div className="rounded-2xl overflow-hidden mb-6">
              <img
                src={mapUrl}
                alt="Location where points were earned"
                className="w-full h-32 object-cover"
                onError={(e) => {
                  console.error("Failed to load Mapbox image");
                  e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="%236b7280">Map unavailable</text></svg>`;
                }}
              />
            </div>

            {/* Points Earned Card */}
            <div className="bg-yellow-100 rounded-2xl p-6 mb-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1 font-inktrap">
                    You Earned
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-inktrap font-bold text-black">
                      {pointsEarned}
                    </span>
                    <span className="text-lg font-inktrap text-black">pts</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-black font-anonymous">
                {`You've just gained access to events, rewards and bespoke
                experiences.`}
              </p>
            </div>

            {/* Your Points Card */}
            <div className="bg-white rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-inktrap text-gray-600 uppercase mb-3">
                YOUR POINTS
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-inktrap font-bold text-black">
                  {playerData?.total_points || pointsEarned}
                </span>
                <span className="text-lg font-inktrap text-black">pts</span>
              </div>

              <div className="pt-0">
                <div className="flex items-center justify-between">
                  <Link className="w-full" href="/leaderboard">
                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-inktrap px-4 py-2 rounded-full text-sm w-full">
                      Leaderboard
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* IRL Network Section */}
            <div className="bg-gradient-to-b from-green-400 to-cyan-400 rounded-2xl p-6 mb-6 text-center">
              <h3 className="text-xl font-inktrap text-black mb-4">
                Learn more and be the first to know about the latest IRL network
                news
              </h3>
              <Link className="w-full" href="/">
                <Button className="bg-white hover:bg-gray-100 text-black font-inktrap px-6 py-3 rounded-full w-full">
                  Visit IRL.ENERGY
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom IRL Section */}
          <div className="py-6">
            <img
              src="/irl-bottom-logo.svg"
              alt="IRL"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Main Content */}
        <div className="px-0 pt-8">
          {/* Title Section */}
          <div className="mb-6">
            <h1 className="text-lg mb-1">Put Yourself</h1>
            <h2 className="text-4xl font-inktrap font-bold text-black leading-tight">
              ON THE MAP
            </h2>
          </div>

          {/* Points Card */}
          <div className="bg-orange-100 rounded-2xl p-4 mb-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 mb-1 font-inktrap">
                  You Can Earn
                </p>
                <p className="text-5xl font-inktrap font-bold text-black">
                  <span className="text-lg font-normal">+</span>
                  100 <span className="text-lg font-normal">pts</span>
                </p>
              </div>
            </div>
          </div>

          {/* Description Text */}
          <div className="space-y-4 mb-8 text-sm text-black font-anonymous">
            <p>
              Check in at locations around the world to earn IRL points and
              unlock exclusive rewards. The IRL network connects culture and
              community through blockchain technology.
            </p>
            <p>
              Share your location to verify your presence and join a global
              network of creators, artists, and culture enthusiasts building the
              future of experiences together.
            </p>
          </div>

          {/* Location Input Section */}
          <div className="mb-6">
            <h3 className="text-lg mb-4 leading-tight">
              Confirm your location to
              <br />
              earn your first points
            </h3>

            <div className="bg-white rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-600 mb-1 font-grotesk">
                SEARCH FOR LOCATION
              </p>
              <div className="relative flex gap-2 items-center">
                <Input
                  placeholder="Williamsburg, NY"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-gray-50 border border-[#313131] rounded-full pl-4 pr-12 py-3 text-black placeholder:text-gray-500"
                />
                <Button
                  size="sm"
                  className="w-10 h-8 rounded-full bg-gray-200 hover:bg-gray-300 p-0 flex justify-center items-center"
                  variant="ghost"
                >
                  <Search className="w-4 h-4 text-black" />
                </Button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <ul className="bg-white rounded-2xl mb-4 max-h-60 overflow-auto">
                {suggestions.map((loc) => (
                  <li
                    key={loc.place_id}
                    className="p-4 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => handleSelect(loc)}
                  >
                    <div className="font-inktrap text-black">{loc.name}</div>
                    <div className="text-sm text-gray-600">
                      {loc.display_name}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map Section */}
          <div className="rounded-2xl overflow-hidden mb-4">
            <img
              src={mapUrl}
              alt="Map showing location"
              className="w-full h-48 object-cover"
              onError={(e) => {
                console.error("Failed to load Mapbox image");
                e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="%236b7280">Map unavailable</text></svg>`;
              }}
            />
          </div>

          {/* Location Confirmation */}
          <div className="bg-white rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3 h-3 text-gray-600" />
              <p className="text-xs text-gray-600 font-grotesk">
                YOUR LOCATION
              </p>
            </div>
            <div className="flex items-center gap-3 mb-4 border border-[#B5B5B5] rounded-full p-2">
              <span className="text-black font-grotesk">{query}</span>
            </div>
            <Button
              onClick={handleCheckin}
              disabled={!selected || !walletAddress || isCheckinLoading}
              className="w-full bg-[#313131] hover:bg-[#313131]/80 text-white font-inktrap py-3 rounded-full disabled:opacity-50 flex justify-between"
            >
              <span>
                {isCheckinLoading ? "Checking in..." : "Confirm to Earn Points"}
              </span>
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
