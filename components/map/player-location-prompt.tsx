'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type CountryOption = {
  id: string;
  iso2: string;
  name: string;
};

type CitySuggestion = {
  mapboxId: string;
  name: string;
  region: string | null;
  placeFormatted: string | null;
};

type PlayerLocationPromptProps = {
  open: boolean;
  walletAddress: string;
  onComplete: () => void;
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
 * Modal that requires a logged-in player to pick country + Mapbox city.
 */
export function PlayerLocationPrompt({
  open,
  walletAddress,
  onComplete,
  className,
}: PlayerLocationPromptProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryId, setCountryId] = useState<string>('');
  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find((c) => c.id === countryId) ?? null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingCountries(true);
    setError(null);

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
        if (!cancelled) setError('Could not load countries. Try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCountries(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

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

  const handleCountryChange = (value: string) => {
    setCountryId(value);
    setSelectedCity(null);
    setCityQuery('');
    setSuggestions([]);
    setIsSuggestOpen(false);
    setError(null);
  };

  const handleSelectCity = (city: CitySuggestion) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setSuggestions([]);
    setIsSuggestOpen(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!walletAddress || !countryId || !selectedCity || !selectedCountry) {
      setError('Select a country and city to continue.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          countryId,
          mapboxId: selectedCity.mapboxId,
          name: selectedCity.name,
          region: selectedCity.region,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.error || json?.message || 'Failed to save location'
        );
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        'pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-location-prompt-title"
    >
      <div className="w-full max-w-md border border-[#EDEDED] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <h2 id="player-location-prompt-title" className="title3 text-[#171717]">
          Where are you based?
        </h2>
        <p className="body-medium mt-2 text-[#757575]">
          Select your country and city so we can tailor local guides and
          rewards.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="player-location-country"
              className="label-medium text-[#171717]"
            >
              Country
            </label>
            <Select
              value={countryId || undefined}
              onValueChange={handleCountryChange}
              disabled={isLoadingCountries || isSaving}
            >
              <SelectTrigger
                id="player-location-country"
                className="h-11 rounded-none border-[#DBDBDB] bg-white"
              >
                <SelectValue
                  placeholder={
                    isLoadingCountries ? 'Loading…' : 'Select a country'
                  }
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

          <div className="relative flex flex-col gap-1.5">
            <label
              htmlFor="player-location-city"
              className="label-medium text-[#171717]"
            >
              City
            </label>
            <Input
              id="player-location-city"
              ref={inputRef}
              value={cityQuery}
              disabled={!selectedCountry || isSaving}
              placeholder={
                selectedCountry
                  ? 'Search for your city'
                  : 'Select a country first'
              }
              onChange={(event) => {
                setCityQuery(event.target.value);
                setSelectedCity(null);
                setError(null);
              }}
              onFocus={() => {
                if (suggestions.length > 0 && !selectedCity) {
                  setIsSuggestOpen(true);
                }
              }}
              className="h-11 rounded-none border-[#DBDBDB]"
              autoComplete="off"
            />
            {isSuggestOpen && suggestions.length > 0 ? (
              <ul
                ref={listRef}
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto border border-[#DBDBDB] bg-white shadow-md"
              >
                {suggestions.map((suggestion) => (
                  <li key={suggestion.mapboxId}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#F5F5F5]"
                      onClick={() => handleSelectCity(suggestion)}
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

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={handleSave}
          disabled={
            isSaving || !countryId || !selectedCity || isLoadingCountries
          }
          className="mt-6 h-11 w-full rounded-none bg-[#171717] text-white hover:bg-black"
        >
          {isSaving ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
