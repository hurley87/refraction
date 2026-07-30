'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type CountryOption = {
  id: string;
  iso2: string;
  name: string;
};

export type CitySuggestion = {
  mapboxId: string;
  name: string;
  region: string | null;
  placeFormatted: string | null;
};

type PlayerLocationFieldsProps = {
  countryId: string;
  onCountryChange: (countryId: string) => void;
  cityQuery: string;
  onCityQueryChange: (query: string) => void;
  selectedCity: CitySuggestion | null;
  onCitySelect: (city: CitySuggestion | null) => void;
  disabled?: boolean;
  /** Match dashboard edit field styling when provided */
  controlClassName?: string;
  className?: string;
};

function useDebounced<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delayMs);
    },
    [fn, delayMs]
  );
}

/**
 * Country select + Mapbox city combobox (selection required, no free text save).
 */
export function PlayerLocationFields({
  countryId,
  onCountryChange,
  cityQuery,
  onCityQueryChange,
  selectedCity,
  onCitySelect,
  disabled = false,
  controlClassName,
  className,
}: PlayerLocationFieldsProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find((c) => c.id === countryId) ?? null;

  const fieldClass =
    controlClassName ??
    'h-11 rounded-none border-[#DBDBDB] bg-white shadow-none';

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCountries(true);
    fetch('/api/countries')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load countries');
        const json = await res.json();
        const list = (json.data?.countries ??
          json.countries ??
          []) as CountryOption[];
        if (!cancelled) setCountries(list);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const performSuggest = useCallback(async (q: string, iso2: string) => {
    if (!iso2 || q.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }
    setIsSuggesting(true);
    try {
      const params = new URLSearchParams({
        countryIso2: iso2,
        q: q.trim(),
      });
      const res = await fetch(`/api/geo/cities/suggest?${params}`);
      if (!res.ok) throw new Error('Suggest failed');
      const json = await res.json();
      const list = (json.data?.suggestions ??
        json.suggestions ??
        []) as CitySuggestion[];
      setSuggestions(list);
      setIsSuggestOpen(list.length > 0);
    } catch {
      setSuggestions([]);
      setIsSuggestOpen(false);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  const debouncedSuggest = useDebounced(performSuggest, 250);

  useEffect(() => {
    if (!selectedCountry || selectedCity) return;
    debouncedSuggest(cityQuery, selectedCountry.iso2);
  }, [cityQuery, selectedCountry, selectedCity, debouncedSuggest]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!isSuggestOpen) return;
      const target = e.target as Node;
      if (listRef.current?.contains(target)) return;
      if (inputRef.current?.contains(target)) return;
      setIsSuggestOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isSuggestOpen]);

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <div className="space-y-2">
        <label
          htmlFor="player-location-country"
          className="label-small uppercase text-[#171717]"
        >
          Country
        </label>
        <Select
          value={countryId || undefined}
          onValueChange={(value) => {
            onCountryChange(value);
            onCitySelect(null);
            onCityQueryChange('');
            setSuggestions([]);
            setIsSuggestOpen(false);
          }}
          disabled={disabled || isLoadingCountries}
        >
          <SelectTrigger
            id="player-location-country"
            className={cn(fieldClass, 'w-full')}
          >
            <SelectValue
              placeholder={isLoadingCountries ? 'Loading…' : 'Select a country'}
            />
          </SelectTrigger>
          <SelectContent className="max-h-64 rounded-none">
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative space-y-2">
        <label
          htmlFor="player-location-city"
          className="label-small uppercase text-[#171717]"
        >
          City
        </label>
        <Input
          id="player-location-city"
          ref={inputRef}
          value={cityQuery}
          disabled={disabled || !selectedCountry}
          placeholder={
            selectedCountry ? 'Search for your city' : 'Select a country first'
          }
          onChange={(event) => {
            onCityQueryChange(event.target.value);
            onCitySelect(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0 && !selectedCity) {
              setIsSuggestOpen(true);
            }
          }}
          className={fieldClass}
          autoComplete="off"
        />
        {isSuggestOpen && suggestions.length > 0 ? (
          <ul
            ref={listRef}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto border border-[#DBDBDB] bg-white shadow-md"
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion.mapboxId}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#F5F5F5]"
                  onClick={() => {
                    onCitySelect(suggestion);
                    onCityQueryChange(suggestion.name);
                    setSuggestions([]);
                    setIsSuggestOpen(false);
                  }}
                >
                  <span className="body-medium text-[#171717]">
                    {suggestion.name}
                  </span>
                  {suggestion.placeFormatted || suggestion.region ? (
                    <span className="text-xs text-[#757575]">
                      {suggestion.placeFormatted || suggestion.region}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {isSuggesting ? (
          <p className="text-xs text-[#757575]">Searching…</p>
        ) : null}
      </div>
    </div>
  );
}
