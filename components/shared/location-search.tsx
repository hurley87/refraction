'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

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
    featureType?: string;
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
    [fn, ms]
  );
}

export default function LocationSearch({
  placeholder = 'Search location',
  proximity,
  onSelect,
  className,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
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
    if (!proximity) return '';
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
          q
        )}&limit=8${proximityParam}&session_token=${token}&access_token=${accessToken}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Suggest failed');
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
    [accessToken, proximityParam]
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
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleRetrieve = useCallback(
    async (s: Suggestion) => {
      if (!accessToken) return;
      const mapboxId = s.mapbox_id || s.id;
      if (!mapboxId) return;
      try {
        const token = ensureSessionToken();
        const base = `https://api.mapbox.com/search/searchbox/v1`;
        const isCategory = s.feature_type === 'category';
        const url = isCategory
          ? `${base}/category/${encodeURIComponent(mapboxId)}?limit=1${proximityParam}&session_token=${token}&access_token=${accessToken}`
          : `${base}/retrieve/${encodeURIComponent(mapboxId)}?session_token=${token}&access_token=${accessToken}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Retrieve failed');
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
          featureType: s.feature_type,
        });
        setIsOpen(false);
        setSuggestions([]);
        setQuery(s.place_formatted || s.name || '');
        inputRef.current?.blur();
      } catch {
        // swallow
      }
    },
    [accessToken, onSelect, proximityParam]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        void handleRetrieve(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!showSearch) {
    return (
      <button
        onClick={() => setShowSearch(true)}
        className={`flex flex-1 items-center gap-2 rounded-full bg-white/80 px-4 h-10 text-[#7d7d7d] shadow-sm transition-colors hover:bg-white hover:text-[#313131] w-full ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="text-sm truncate">{placeholder}</span>
      </button>
    );
  }

  return (
    <div className={`relative flex flex-1 items-center gap-2 ${className}`}>
      {/* Search Input */}
      <div className="flex-1 relative">
        <div className="flex items-center gap-2 rounded-full bg-white/80 shadow-sm h-10 px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[#7d7d7d] shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            autoFocus
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
            className="flex-1 h-full border-0 p-0 text-sm text-[#313131] placeholder:text-[#7d7d7d] bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            onClick={() => {
              setShowSearch(false);
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
              setActiveIndex(-1);
            }}
            className="flex items-center justify-center size-5 rounded-full bg-[#ededed] hover:bg-[#e0e0e0] transition-colors shrink-0"
            aria-label="Close"
            type="button"
          >
            <svg
              className="w-3 h-3 text-[#7d7d7d]"
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
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#ededed] overflow-hidden z-50"
          >
            <div role="listbox" className="max-h-64 overflow-y-auto">
              {suggestions.map((s, idx) => {
                const isActive = idx === activeIndex;
                const id = s.id || s.mapbox_id || String(idx);
                return (
                  <div
                    key={id}
                    role="option"
                    aria-selected={isActive}
                    className={`flex flex-col gap-1 px-4 py-3 cursor-pointer ${
                      isActive ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      // Prevent input blur before click
                      e.preventDefault();
                    }}
                    onClick={() => void handleRetrieve(s)}
                  >
                    <p className="font-medium text-[#313131] text-sm">
                      {s.name || s.place_formatted || 'Unnamed'}
                    </p>
                    {s.place_formatted && (
                      <p className="text-[#7d7d7d] text-xs truncate">
                        {s.place_formatted}
                      </p>
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
