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
  placeholder = "Search places, addresses, or POIs",
  proximity,
  onSelect,
  className,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

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
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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

  return (
    <div className={className}>
      <div className="flex gap-2 items-center">
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
          className="flex-1 h-11 md:h-12 rounded-full bg-transparent px-4 text-sm text-black placeholder:text-black/60 border border-[#B5B5B5] bg-white"
        />
        <Button
          onClick={() => debouncedSuggest(query)}
          size="sm"
          className="w-11 h-11 md:w-12 md:h-12 rounded-full p-0"
          disabled={isLoading}
          aria-label="Search"
        >
          <img src="/miniapp/search.png" alt="Search" className="w-11 h-11" />
        </Button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-black/5 bg-white/90 dark:bg-zinc-900/80 backdrop-blur p-1 shadow-2xl"
          role="listbox"
        >
          {suggestions.map((s, idx) => {
            const isActive = idx === activeIndex;
            const id = s.id || s.mapbox_id || String(idx);
            return (
              <div
                key={id}
                role="option"
                aria-selected={isActive}
                className={`px-3 py-2 cursor-pointer rounded-lg text-sm ${
                  isActive
                    ? "bg-black/5 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  // Prevent input blur before click
                  e.preventDefault();
                }}
                onClick={() => void handleRetrieve(s)}
              >
                <div className="font-medium text-black dark:text-white">
                  {s.name || s.place_formatted || "Unnamed"}
                </div>
                {s.place_formatted && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {s.place_formatted}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
