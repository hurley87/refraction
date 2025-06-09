"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

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
  const [query, setQuery] = useState("Williamsburg, NY");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState<LocationSuggestion | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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

  // Use Mapbox Static Images API
  const mapUrl = selected
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-marker+ff0000(${selected.lon},${selected.lat})/${selected.lon},${selected.lat},13,0/400x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
    : "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-73.9442,40.7081,12,0/400x300@2x?access_token=" +
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-orange-200 to-yellow-200">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 text-black text-sm font-medium">
        <div className="bg-white rounded-full px-3 py-1">
          <span className="font-bold">IRL</span>
        </div>
        <div className="text-center font-medium">9:41</div>
        <div className="w-8 h-4 bg-white rounded-full relative">
          <div className="w-3 h-3 bg-pink-500 rounded-full absolute right-0.5 top-0.5"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-lg font-medium text-black mb-2">TITLE ABOUT</h1>
          <h2 className="text-4xl font-bold text-black leading-tight">
            THIS
            <br />
            CHALLENGE
          </h2>
        </div>

        {/* Points Card */}
        <div className="bg-orange-100 rounded-2xl p-4 mb-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">You Earned</p>
              <p className="text-3xl font-bold text-black">
                +100 <span className="text-lg font-normal">pts</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center">
              <span className="text-white">😊</span>
            </div>
          </div>
        </div>

        {/* Description Text */}
        <div className="space-y-4 mb-8 text-sm text-black">
          <p>
            Lorem ipsum dolor sit amet consectetur. Molestie eu faucibus morbi
            morbi. Amet commodo eleifend massa tortor velit.
          </p>
          <p>
            Lorem ipsum dolor sit amet consectetur. Molestie eu faucibus morbi
            morbi. Amet commodo eleifend massa tortor velit.
          </p>
        </div>

        {/* Location Input Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-black mb-4">
            Copy about inputting your
            <br />
            location and signing up
          </h3>

          <div className="bg-white rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-3">SEARCH FOR LOCATION</p>
            <div className="relative">
              <Input
                placeholder="Williamsburg, NY"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-gray-50 border-0 rounded-full pl-4 pr-12 py-3 text-black placeholder:text-gray-500"
              />
              <Button
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 p-0"
                variant="ghost"
              >
                <Search className="w-4 h-4 text-gray-600" />
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
                  <div className="font-medium text-black">{loc.name}</div>
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
          <p className="text-sm text-gray-600 mb-3">YOUR LOCATION</p>
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-gray-600" />
            <span className="text-black font-medium">{query}</span>
          </div>
          <Button
            onClick={() => setConfirmed(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-3 rounded-full"
          >
            Confirm to Earn Points
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

        {confirmed && (
          <div className="text-center py-4">
            <p className="text-xl font-bold text-green-600">Points earned!</p>
          </div>
        )}
      </div>

      {/* Bottom IRL Section */}
      <div className="mt-8 bg-gradient-to-b from-green-400 to-green-600 relative overflow-hidden">
        {/* Curved lines decoration */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute border-2 border-white/30 rounded-full"
              style={{
                width: `${300 + i * 60}px`,
                height: `${300 + i * 60}px`,
                left: "50%",
                top: "60%",
                transform: "translateX(-50%)",
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center py-16">
          <h2 className="text-4xl font-bold text-white">IRL</h2>
        </div>
      </div>
    </div>
  );
}
