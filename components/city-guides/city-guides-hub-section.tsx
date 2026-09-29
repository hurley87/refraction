'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapPin } from 'lucide-react';

import CityGuideListCard from '@/components/city-guides/city-guide-list-card';
import CityGuidesContentFilterRow, {
  type CityGuidesContentFilter,
} from '@/components/city-guides/city-guides-content-filter-row';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GuideHubListItem } from '@/lib/db/guides';
import {
  cityGuidesHubSearch,
  parseCityGuidesHubQuery,
} from '@/lib/guides/city-guides-hub-query';

/** Default tag for guides that apply everywhere. */
const GLOBAL_CITY = 'Global';

function filterByCity(
  entries: GuideHubListItem[],
  selectedCity: string
): GuideHubListItem[] {
  if (selectedCity === 'all') return entries;
  return entries.filter((e) => e.city === selectedCity);
}

function publishedTimestamp(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function filterByKind(
  entries: GuideHubListItem[],
  filter: CityGuidesContentFilter
): GuideHubListItem[] {
  if (filter === 'guides') {
    return entries.filter((e) => e.kind === 'city_guide');
  }
  return entries.filter((e) => e.kind === 'editorial');
}

function sortByPublishedAt(entries: GuideHubListItem[]): GuideHubListItem[] {
  const next = [...entries];
  next.sort((a, b) => {
    const ta = publishedTimestamp(a.publishedAt);
    const tb = publishedTimestamp(b.publishedAt);
    return tb - ta;
  });
  return next;
}

export function CityGuidesHubSection({
  entries,
  typeParam = null,
  cityParam = null,
}: {
  entries: GuideHubListItem[];
  /** `type` query value, e.g. `editorial`. */
  typeParam?: string | null;
  /** `city` query value, e.g. `Berlin` or `Global`. */
  cityParam?: string | null;
}) {
  const pathname = usePathname();

  // Distinct city tags present in the feed power the dropdown (no empties).
  const cityOptions = useMemo(() => {
    const values = new Set<string>();
    entries.forEach((e) => {
      const city = e.city?.trim();
      if (city && city !== GLOBAL_CITY) values.add(city);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const hasGlobalEntries = useMemo(
    () => entries.some((e) => (e.city?.trim() || GLOBAL_CITY) === GLOBAL_CITY),
    [entries]
  );

  const knownCities = useMemo(
    () => (hasGlobalEntries ? [...cityOptions, GLOBAL_CITY] : cityOptions),
    [cityOptions, hasGlobalEntries]
  );

  const initialQuery = parseCityGuidesHubQuery(
    { type: typeParam, city: cityParam },
    knownCities
  );
  const [filter, setFilter] = useState<CityGuidesContentFilter>(
    initialQuery.type
  );
  const [selectedCity, setSelectedCity] = useState(initialQuery.city);

  const writeFilters = (
    nextType: CityGuidesContentFilter,
    nextCity: string
  ) => {
    setFilter(nextType);
    setSelectedCity(nextCity);
  };

  useEffect(() => {
    const next = `${pathname}${cityGuidesHubSearch({
      type: filter,
      city: selectedCity,
    })}`;
    if (`${window.location.pathname}${window.location.search}` === next) return;
    window.history.replaceState(null, '', next);
  }, [pathname, filter, selectedCity]);

  const visible = useMemo(() => {
    const byKindAndCity = filterByCity(
      filterByKind(entries, filter),
      selectedCity
    );
    return sortByPublishedAt(byKindAndCity);
  }, [entries, filter, selectedCity]);

  const emptyMessage =
    entries.length === 0
      ? 'No guides to show yet.'
      : 'No guides match this filter.';

  return (
    <>
      <CityGuidesContentFilterRow
        selectedFilter={filter}
        onFilterChange={(next) => writeFilters(next, selectedCity)}
      />

      {(cityOptions.length > 0 || hasGlobalEntries) && (
        <div className="border-b border-[#E5E5E5] py-2">
          <Select
            value={selectedCity}
            onValueChange={(next) => writeFilters(filter, next)}
          >
            <SelectTrigger
              aria-label="Filter guides by city"
              className="flex h-10 w-full items-center justify-between rounded-none border-0 bg-[#a9a9a9] px-4 shadow-none transition-colors hover:bg-[#9a9a9a] focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden"
            >
              <span className="truncate label-small uppercase tracking-wide text-black">
                <SelectValue placeholder="All cities" />
              </span>
              <MapPin className="size-5 shrink-0 text-black" aria-hidden />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {hasGlobalEntries && (
                <SelectItem value={GLOBAL_CITY}>Global</SelectItem>
              )}
              {cityOptions.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col">
        {visible.length === 0 ? (
          <p className="body-medium py-8 text-center text-[#757575]">
            {emptyMessage}
          </p>
        ) : (
          visible.map((item, index) => (
            <CityGuideListCard
              key={item.id}
              guideKind={item.guideKind}
              title={item.title}
              titleHighlightWords={item.titleHighlightWords}
              preview={item.preview}
              publishedAt={item.publishedAt}
              imageSrc={item.imageSrc}
              imageAlt={item.imageAlt}
              readHref={item.readHref}
              authors={item.authors}
              city={item.city}
              onCityClick={(city) => writeFilters(filter, city)}
              className={index === 0 ? 'border-t-0' : undefined}
            />
          ))
        )}
      </div>
    </>
  );
}
