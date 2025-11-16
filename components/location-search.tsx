"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Suggestion = {
  id?: string;
  mapbox_id?: string;
  name?: string;
  place_formatted?: string;
  feature_type?: string;
};

type RetrievedFeature = {
  features?: Array<{
    id?: string;
    geometry?: { type: string; coordinates: [number, number] };
    properties?: Record<string, unknown>;
    name?: string;
    place_formatted?: string;
  }>;
};

export interface LocationSearchProps {
  placeholder?: string;
  proximity?: { longitude: number; latitude: number } | null;
  onSelect: (picked: {
    longitude: number;
    latitude: number;
    id: string;
    name?: string;
    placeFormatted?: string;
  }) => void;
  className?: string;
}

function useDebounced<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const timeoutRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => fn(...args), ms);
    },
    [fn, ms],
  );
}

export default function LocationSearch({
  placeholder = "Search location",
  proximity,
  onSelect,
  className,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Create/rotate a session token per search session
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current =
        self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    }
    return sessionTokenRef.current;
  };

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const proximityParam = useMemo(() => {
    if (!proximity) return "";
    return `&proximity=${proximity.longitude},${proximity.latitude}`;
  }, [proximity]);

  const performSuggest = useCallback(
    async (q: string) => {
      if (!accessToken) return setSuggestions([]);
      if (!q || q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const token = ensureSessionToken();
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
          q,
        )}&limit=8${proximityParam}&session_token=${token}&access_token=${accessToken}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Suggest failed");
        const json = await res.json();
        const list: Suggestion[] = Array.isArray(json?.suggestions)
          ? json.suggestions
          : [];
        setSuggestions(list);
        setIsOpen(true);
        setActiveIndex(list.length ? 0 : -1);
      } catch {
        // Fallback: keep silent, clear suggestions
        setSuggestions([]);
        setIsOpen(false);
      }
    },
    [accessToken, proximityParam],
  );

  const debouncedSuggest = useDebounced(performSuggest, 250);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!isOpen) return;
      const target = e.target as Node;
      if (listRef.current && listRef.current.contains(target)) return;
      if (inputRef.current && inputRef.current.contains(target as Node)) return;
      setIsOpen(false);
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleRetrieve = useCallback(
    async (s: Suggestion) => {
      if (!accessToken) return;
      const mapboxId = s.mapbox_id || s.id;
      if (!mapboxId) return;
      try {
        const token = ensureSessionToken();
        const base = `https://api.mapbox.com/search/searchbox/v1`;
        const isCategory = s.feature_type === "category";
        const url = isCategory
          ? `${base}/category/${encodeURIComponent(mapboxId)}?limit=1${proximityParam}&session_token=${token}&access_token=${accessToken}`
          : `${base}/retrieve/${encodeURIComponent(mapboxId)}?session_token=${token}&access_token=${accessToken}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Retrieve failed");
        const json: RetrievedFeature = await res.json();
        const feat = json.features?.[0];
        const coords = feat?.geometry?.coordinates;
        if (!coords) return;
        // Rotate token after successful retrieve (end of session)
        sessionTokenRef.current = null;
        onSelect({
          longitude: coords[0],
          latitude: coords[1],
          id: mapboxId,
          name: s.name,
          placeFormatted: s.place_formatted,
        });
        setIsOpen(false);
        setSuggestions([]);
        setQuery(s.place_formatted || s.name || "");
        inputRef.current?.blur();
      } catch {
        // swallow
      }
    },
    [accessToken, onSelect, proximityParam],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        void handleRetrieve(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  if (!showSearch) {
    return (
      <button
        onClick={() => setShowSearch(true)}
        className="flex flex-1 items-center gap-2 self-stretch rounded-[1000px] border border-[#B5B5B5] bg-gradient-to-b from-[rgba(255,255,255,0.16)] to-[rgba(255,255,255,0.45)] px-4 py-2 h-[48px] text-black backdrop-blur-[232px] shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] hover:opacity-90 transition-opacity w-full"
      >
        <span className="font-['ABC-Monument-Grotesk',sans-serif] text-center text-[#7d7d7d] text-[16px] font-normal leading-[22px] tracking-[-0.48px]">
          Search location
        </span>
      </button>
    );
  }

  return (
    <div
      className={`backdrop-blur-[232px] bg-[rgba(255,255,255,0.65)] border border-[rgba(255,255,255,0.65)] rounded-[24px] p-2 ${className}`}
    >
      <div className="flex flex-col gap-4">
        {/* Search Input and Close Button */}
        <div className="flex gap-2 items-center ">
          <div className="flex-1 bg-white border border-[#b5b5b5] rounded-[1000px] h-[48px]">
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                setIsOpen(true);
                debouncedSuggest(val);
              }}
              onFocus={() => {
                if (query.length >= 2 && suggestions.length === 0) {
                  debouncedSuggest(query);
                }
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="h-full rounded-[1000px] border-0 px-4 py-1 text-[16px] leading-[22px] text-[#313131] placeholder:text-[#7d7d7d] bg-transparent"
            />
          </div>
          <Button
            onClick={() => {
              setShowSearch(false);
              setQuery("");
              setSuggestions([]);
              setIsOpen(false);
              setActiveIndex(-1);
            }}
            className="w-10 h-10 rounded-[100px] border border-[#ededed] bg-white p-2"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-[#b5b5b5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Recent Searches Section */}
        {isOpen && suggestions.length > 0 && (
          <div ref={listRef} className="flex flex-col">
            <div role="listbox" className="max-h-64 overflow-y-auto">
              {suggestions.map((s, idx) => {
                const isActive = idx === activeIndex;
                const id = s.id || s.mapbox_id || String(idx);
                return (
                  <div
                    key={id}
                    role="option"
                    aria-selected={isActive}
                    className={`flex flex-col gap-1 px-4 py-2 cursor-pointer ${
                      isActive ? "bg-black/5" : "hover:bg-black/5"
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      // Prevent input blur before click
                      e.preventDefault();
                    }}
                    onClick={() => void handleRetrieve(s)}
                  >
                    <div className="flex items-center">
                      <p className="font-medium text-[#4f4f4f] text-[16px] leading-[16px] tracking-[-1.28px]">
                        {s.name || s.place_formatted || "Unnamed"}
                      </p>
                    </div>
                    {s.place_formatted && (
                      <div className="flex gap-2 items-center">
                        <svg
                          className="w-6 h-6 text-[#b5b5b5]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <p className="text-[#7d7d7d] text-[11px] leading-[16px] tracking-[0.44px] uppercase">
                          {s.place_formatted}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
