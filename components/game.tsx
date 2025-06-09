"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export default function Game() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState<LocationSuggestion | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "User-Agent": "refraction-app",
        },
        signal: controller.signal,
      }
    )
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

  const mapUrl = selected
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${selected.lat},${selected.lon}&zoom=13&size=865x512&markers=${selected.lat},${selected.lon},red-pushpin`
    : "";

  return (
    <div className="p-6 flex flex-col gap-4 max-w-xl mx-auto">
      <Input
        placeholder="Enter a location"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-white text-black"
      />
      {suggestions.length > 0 && (
        <ul className="border rounded-md bg-white text-black max-h-60 overflow-auto">
          {suggestions.map((loc) => (
            <li
              key={loc.place_id}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSelect(loc)}
            >
              {loc.display_name}
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <>
          <img
            src={mapUrl}
            alt="Selected location map"
            className="w-full h-auto rounded"
          />
          {!confirmed ? (
            <Button onClick={() => setConfirmed(true)}>
              Confirm to earn points
            </Button>
          ) : (
            <p className="text-xl text-center text-[#E04220] font-inktrap">
              Points earned!
            </p>
          )}
        </>
      )}
    </div>
  );
}
