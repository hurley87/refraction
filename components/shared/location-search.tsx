'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  buildFullAddressFromSearchBoxProps,
  deriveDisplayNameAndAddress,
  type SearchBoxPlaceProperties,
} from '@/lib/utils/location-autofill';

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
    properties?: SearchBoxPlaceProperties;
    name?: string;
    place_formatted?: string;
  }>;
};

const RECENT_SEARCHES_STORAGE_KEY = 'irl-location-recent-searches';
const MAX_RECENT_SEARCHES = 3;

export type RecentSearchEntry = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  placeFormatted?: string;
  featureType?: string;
};

function loadRecentSearches(): RecentSearchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentSearchEntry =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as RecentSearchEntry).id === 'string' &&
          typeof (x as RecentSearchEntry).latitude === 'number' &&
          typeof (x as RecentSearchEntry).longitude === 'number'
      )
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearches(entries: RecentSearchEntry[]) {
  try {
    localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // ignore quota / private mode
  }
}

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
  /** Typography for collapsed placeholder + expanded input (e.g. map-specific body styles). */
  inputClassName?: string;
}

/** Secondary line under suggestion title — address / place_formatted. */
const SUGGESTION_ADDRESS_CLASS =
  "m-0 truncate text-[11px] font-medium not-italic leading-[16px] tracking-[0.44px] uppercase text-[color:var(--Text-Secondary-Text,#757575)] font-['ABC_Monument_Grotesk_Semi-Mono_Unlicensed_Trial',sans-serif]";

/** Wraps segments of `text` that match `query` (case-insensitive) in black; rest uses `nonMatchClassName`. */
function highlightQueryInText(
  text: string,
  query: string,
  nonMatchClassName: string
): ReactNode {
  const q = query.trim();
  if (!text) return null;
  if (!q) {
    return <span className={nonMatchClassName}>{text}</span>;
  }
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => {
        if (part === '') return null;
        const isMatch = part.toLowerCase() === q.toLowerCase();
        return (
          <span key={i} className={isMatch ? 'text-black' : nonMatchClassName}>
            {part}
          </span>
        );
      })}
    </>
  );
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
  placeholder = 'Search',
  proximity,
  onSelect,
  className,
  inputClassName,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  const persistRecentSearch = useCallback((entry: RecentSearchEntry) => {
    setRecentSearches((prev) => {
      const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      saveRecentSearches(next);
      return next;
    });
  }, []);

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

  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < 2 && recentSearches.length > 0) {
      setActiveIndex(0);
    }
  }, [isOpen, query, recentSearches.length]);

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
        const props = feat?.properties;
        if (!coords) return;
        // Rotate token after successful retrieve (end of session)
        sessionTokenRef.current = null;
        // Prefer retrieve `properties` over suggestion fields — suggestions can omit or
        // mislabel POIs; authoritative name / feature_type / full_address live on the feature.
        const nameFromRetrieve =
          props?.name_preferred?.trim() || props?.name?.trim() || s.name;
        const placeFormattedFromRetrieve =
          buildFullAddressFromSearchBoxProps(props) || s.place_formatted;
        const featureTypeFromRetrieve = props?.feature_type ?? s.feature_type;
        const idFromRetrieve = props?.mapbox_id?.trim() || mapboxId;
        const { displayName, address } = deriveDisplayNameAndAddress({
          name: nameFromRetrieve,
          placeFormatted: placeFormattedFromRetrieve,
          featureType: featureTypeFromRetrieve,
        });
        const picked = {
          longitude: coords[0],
          latitude: coords[1],
          id: idFromRetrieve,
          name: displayName?.trim() || nameFromRetrieve?.trim() || undefined,
          placeFormatted: address || placeFormattedFromRetrieve,
          featureType: featureTypeFromRetrieve,
        };
        onSelect(picked);
        persistRecentSearch({
          id: picked.id,
          latitude: picked.latitude,
          longitude: picked.longitude,
          name: picked.name,
          placeFormatted: picked.placeFormatted,
          featureType: picked.featureType,
        });
        setIsOpen(false);
        setSuggestions([]);
        // Show POI / place name in the bar when available, not only the formatted address.
        setQuery(
          picked.name?.trim() ||
            picked.placeFormatted ||
            s.name?.trim() ||
            s.place_formatted ||
            ''
        );
        inputRef.current?.blur();
      } catch {
        // swallow
      }
    },
    [accessToken, onSelect, persistRecentSearch, proximityParam]
  );

  const handleSelectRecent = useCallback(
    (entry: RecentSearchEntry) => {
      onSelect({
        longitude: entry.longitude,
        latitude: entry.latitude,
        id: entry.id,
        name: entry.name,
        placeFormatted: entry.placeFormatted,
        featureType: entry.featureType,
      });
      persistRecentSearch(entry);
      setIsOpen(false);
      setQuery(entry.name?.trim() || entry.placeFormatted || '');
      inputRef.current?.blur();
    },
    [onSelect, persistRecentSearch]
  );

  const showRecentPanel = query.trim().length < 2 && recentSearches.length > 0;
  const showApiSuggestions = query.trim().length >= 2 && suggestions.length > 0;
  const dropdownOpen = isOpen && (showRecentPanel || showApiSuggestions);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      return;
    }
    if (!isOpen) return;
    if (showRecentPanel) {
      const len = recentSearches.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, len - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < len) {
          handleSelectRecent(recentSearches[activeIndex]);
        }
      }
      return;
    }
    if (showApiSuggestions) {
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
      }
    }
  };

  if (!showSearch) {
    return (
      <button
        onClick={() => setShowSearch(true)}
        className={cn(
          'box-border flex h-10 max-h-10 min-h-10 w-full flex-1 items-center gap-2 rounded-full bg-white/80 px-4 py-0 shadow-sm transition-colors hover:bg-white',
          inputClassName
            ? 'text-inherit'
            : 'text-[#7d7d7d] hover:text-[#313131]',
          className
        )}
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
        <span className={cn('min-w-0 flex-1 truncate text-sm', inputClassName)}>
          {placeholder}
        </span>
      </button>
    );
  }

  return (
    <div className={`relative flex flex-1 items-center gap-2 ${className}`}>
      {/* Search Input */}
      <div className="flex-1 relative">
        <div
          className={cn(
            'box-border flex h-10 max-h-10 min-h-10 items-center gap-2 rounded-full border border-transparent bg-white/80 px-4 py-0 shadow-sm transition-[border-radius,background-color,border-color,box-shadow]',
            'focus-within:rounded-[24px] focus-within:border-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)] focus-within:bg-[color:var(--Backgrounds-Background,#FFF)] focus-within:shadow-[0_0_0_2px_#FFE600]'
          )}
        >
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
              setIsOpen(true);
              if (query.trim().length >= 2 && suggestions.length === 0) {
                debouncedSuggest(query);
              }
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-full flex-1 border-0 bg-transparent p-0 text-sm text-[#313131] placeholder:text-[#7d7d7d] focus-visible:ring-0 focus-visible:ring-offset-0',
              inputClassName
            )}
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

        {/* Recent searches + API suggestions */}
        {dropdownOpen && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#ededed] overflow-hidden z-50"
          >
            {showRecentPanel && (
              <>
                <div className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-[0.44px] text-[color:var(--Text-Secondary-Text,#757575)]">
                  Recent searches
                </div>
                <div
                  role="listbox"
                  aria-label="Recent searches"
                  className="max-h-64 overflow-y-auto"
                >
                  {recentSearches.map((entry, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={entry.id}
                        role="option"
                        aria-selected={isActive}
                        className={`flex flex-col gap-1 px-4 py-3 cursor-pointer ${
                          isActive ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectRecent(entry)}
                      >
                        <h4 className="m-0">
                          {highlightQueryInText(
                            entry.name || entry.placeFormatted || 'Unnamed',
                            query,
                            'text-[#757575]'
                          )}
                        </h4>
                        {entry.placeFormatted && (
                          <div className="flex min-w-0 items-start gap-2">
                            <svg
                              aria-hidden
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--Text-Secondary-Text,#757575)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <p
                              className={cn(
                                SUGGESTION_ADDRESS_CLASS,
                                'min-w-0 flex-1'
                              )}
                            >
                              {highlightQueryInText(
                                entry.placeFormatted,
                                query,
                                'text-[color:var(--Text-Secondary-Text,#757575)]'
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {showApiSuggestions && (
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
                      <h4 className="m-0">
                        {highlightQueryInText(
                          s.name || s.place_formatted || 'Unnamed',
                          query,
                          'text-[#757575]'
                        )}
                      </h4>
                      {s.place_formatted && (
                        <div className="flex min-w-0 items-start gap-2">
                          <svg
                            aria-hidden
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--Text-Secondary-Text,#757575)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <p
                            className={cn(
                              SUGGESTION_ADDRESS_CLASS,
                              'min-w-0 flex-1'
                            )}
                          >
                            {highlightQueryInText(
                              s.place_formatted,
                              query,
                              'text-[color:var(--Text-Secondary-Text,#757575)]'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
