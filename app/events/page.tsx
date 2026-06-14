'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CalendarX2, Loader2, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import MapNav, { MAP_NAV_MOBILE_FLUSH_X } from '@/components/map/mapnav';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { buildCityMatcher } from '@/lib/utils/normalize-city';
import type { DiceEvent, DiceImage, DiceVenue } from '@/lib/dice';

interface EventsResponse {
  events: DiceEvent[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  start: Date | null;
  end: Date | null;
  poster: string | null;
  location: string;
  ticketsUrl: string;
  mapsUrl?: string | null;
  /** True for manually-added (non-DICE) events. */
  isManual: boolean;
  /** True when the event is hosted by IRL (manual events only). */
  hostedByIrl: boolean;
  /** Canonical city slug used for filtering; null when unmatched. */
  citySlug: string | null;
}

interface ManualEvent {
  id?: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  endDate?: string | null;
  city: string;
  mapsLink: string;
  rsvpLink: string;
  hosted?: boolean;
  citySlug?: string | null;
}

interface CityOption {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
}

type CityMatcher = (cityText: string | null | undefined) => string | null;

type DateSortOrder = 'asc' | 'desc';

const SECTION_TITLE_CLASS = 'text-black body-small font-monument-grotesk';

const REGISTER_ARROW_PATH = '/right-arrow.svg';

/** 24×24px circle, white fill — arrow icon sits inside. */
const REGISTER_ICON_CIRCLE_LIGHT_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white';

/** Featured REGISTER CTA (SDS: 44px bar, primary text fill, SDS padding). */
const FIND_TICKETS_CTA_CLASS =
  'flex h-11 min-h-[44px] w-full shrink-0 self-stretch items-center justify-between bg-[var(--Text-Primary-Text,#171717)] py-[var(--sds-size-space-200)] px-[var(--sds-size-space-400)] label-large uppercase tracking-wide text-[var(--Text-Primary-CTA,#FFF)]';

/** Upcoming list REGISTER: gray bar, black label, arrow on black circle. */
const UPCOMING_REGISTER_CTA_CLASS =
  'flex h-11 min-h-[44px] w-full shrink-0 self-stretch items-center justify-between bg-[#DBDBDB] py-[var(--sds-size-space-200)] px-[var(--sds-size-space-400)] label-large uppercase tracking-wide text-black';

/** Arrow icon on black disc (upcoming cards). */
const REGISTER_ICON_CIRCLE_DARK_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black';

/** Date/location meta pills — 16px height (border-box), SDS gap/padding. */
const EVENT_META_PILL_FEATURED_CLASS =
  'flex h-4 shrink-0 items-center border border-solid box-border px-[var(--sds-size-space-100)] py-0 [border-color:var(--Text-Secondary-Text,#757575)] gap-[var(--sds-size-space-050)]';

/** List card date/location pills — 16px height. */
const EVENT_META_PILL_LIST_CLASS =
  'flex h-4 shrink-0 items-center gap-1 border border-solid border-neutral-200 bg-neutral-50 px-2 py-0 box-border';

/** List card poster thumb: 101×126px, aspect 97/121. */
const EVENT_LIST_POSTER_IMAGE_CLASS =
  'h-[126px] w-[101px] shrink-0 object-cover aspect-[97/121] transition-opacity hover:opacity-90';

const EVENT_LIST_POSTER_PLACEHOLDER_CLASS =
  'flex h-[126px] w-[101px] shrink-0 items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 aspect-[97/121]';

/** Map control: SDS secondary CTA bg, primary text underline bar, label-medium + arrow. */
const EVENT_MAP_LINK_CLASS =
  'flex h-[16px] shrink-0 items-center gap-[var(--sds-size-space-200)] border-b border-solid box-border bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-2 py-0 [border-bottom-color:var(--Text-Primary-Text,#171717)] transition-colors hover:bg-[#c9c9c9]';

function EventsMapLink({ href }: { href: string }) {
  return (
    <Link href={href} className={EVENT_MAP_LINK_CLASS}>
      <span className="label-medium uppercase leading-none text-[var(--Text-Primary-Text,#171717)]">
        MAP
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        className="size-[15px] shrink-0"
        aria-hidden
      >
        <path
          d="M13.1862 2.81317V10.2468H11.2604L11.4205 6.48407L11.4362 6.10712L11.1696 6.37469L4.4469 13.1247L2.87268 11.5485L9.60803 4.80243L9.87561 4.53485L9.49768 4.55243L5.76721 4.72333V2.81317H13.1862Z"
          fill="#171717"
          stroke="#757575"
          strokeWidth="0.29358"
        />
      </svg>
    </Link>
  );
}

const parseEventDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Manual events are stored as date-only values at UTC midnight (e.g.
 * "2026-06-03T00:00:00+00:00"). Parsing them as instants shifts them to the
 * previous day for viewers in negative UTC offsets, so an event happening today
 * gets mis-classified as past. Parse the calendar day in local time instead.
 */
const parseManualEventDate = (
  value: string | null | undefined
): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return parseEventDate(value);
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPoster = (images: DiceImage[] | null | undefined): string | null => {
  if (!images || images.length === 0) return null;
  const usableImages = images.filter(
    (image): image is DiceImage => image != null
  );
  if (usableImages.length === 0) return null;
  const preferred =
    usableImages.find((image) => image.type === 'SQUARE') ?? usableImages[0];
  return preferred?.url ?? null;
};

const getLocation = (venue: DiceVenue | undefined): string => {
  if (!venue) return 'Location TBA';
  const cityCountry = [venue.city, venue.country].filter(Boolean).join(', ');
  return cityCountry || venue.name || 'Location TBA';
};

const EVENTS_MAP_HREF = '/interactive-map';

const getTicketsUrl = (eventName: string): string =>
  `https://dice.fm/search?q=${encodeURIComponent(eventName)}`;

const monthAbbr = (date: Date): string =>
  date.toLocaleString('en-US', { month: 'short' }).slice(0, 3).toUpperCase();

const twoDigitYear = (date: Date): string =>
  String(date.getFullYear()).slice(-2);

const formatDateChip = (date: Date | null): string => {
  if (!date) return 'DATE TBA';
  return `${monthAbbr(date)} ${date.getDate()}/${twoDigitYear(date)}`;
};

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Date chip for an event. Single-day events (no end, or end on the same day)
 * render identically to `formatDateChip`; multi-day events render a range in
 * the same typography, e.g. "MAY 22–24/26".
 */
const formatEventDateChip = (start: Date | null, end: Date | null): string => {
  if (!start) return 'DATE TBA';
  if (!end || isSameCalendarDay(start, end)) return formatDateChip(start);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    // MAY 22–24/26
    return `${monthAbbr(start)} ${start.getDate()}–${end.getDate()}/${twoDigitYear(end)}`;
  }
  if (sameYear) {
    // MAY 30–JUN 1/26
    return `${monthAbbr(start)} ${start.getDate()}–${monthAbbr(end)} ${end.getDate()}/${twoDigitYear(end)}`;
  }
  // DEC 30/25–JAN 2/26
  return `${formatDateChip(start)}–${formatDateChip(end)}`;
};

const isTodayOrFuture = (date: Date | null): boolean => {
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
};

/** Midnight (local) timestamp for a date, for calendar-day comparisons. */
const startOfDayMs = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Date used to classify an event as upcoming vs past: the end date for
 * multi-day events (so an in-progress event stays upcoming), else the start.
 * Single-day events have no end, so this is identical to the start date.
 */
const eventStatusDate = (event: PublicEvent): Date | null =>
  event.end ?? event.start;

const toPublicEvent = (
  event: DiceEvent,
  matchCity: CityMatcher
): PublicEvent => {
  const primaryVenue = event.venues?.[0];
  return {
    id: event.id,
    title: event.name,
    description: event.description ?? null,
    start: parseEventDate(event.startDatetime),
    end: parseEventDate(event.endDatetime),
    poster: getPoster(event.images),
    location: getLocation(primaryVenue),
    ticketsUrl: getTicketsUrl(event.name),
    mapsUrl: EVENTS_MAP_HREF,
    isManual: false,
    hostedByIrl: false,
    citySlug: matchCity(primaryVenue?.city),
  };
};

export default function EventsPage() {
  const dateSortOrder: DateSortOrder = 'asc';
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dateOpen, setDateOpen] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement | null>(null);

  // Hydrate filter state from the URL once on mount (shareable links).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedCity(params.get('city') ?? 'all');
    setDateFrom(params.get('from') ?? '');
    setDateTo(params.get('to') ?? '');
    setFiltersHydrated(true);
  }, []);

  // Keep the URL in sync with active filters (without adding history entries).
  useEffect(() => {
    if (!filtersHydrated) return;
    const params = new URLSearchParams();
    if (selectedCity !== 'all') params.set('city', selectedCity);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, [selectedCity, dateFrom, dateTo, filtersHydrated]);

  // Close the date popover when clicking outside of it.
  useEffect(() => {
    if (!dateOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        dateMenuRef.current &&
        !dateMenuRef.current.contains(event.target as Node)
      ) {
        setDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [dateOpen]);

  const clearFilters = () => {
    setSelectedCity('all');
    setDateFrom('');
    setDateTo('');
    setDateOpen(false);
  };

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery<EventsResponse>({
    queryKey: ['public-dice-events'],
    queryFn: async () => {
      const response = await fetch('/api/dice/events');
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? 'Failed to fetch events');
      }
      return body.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: manualEvents,
    isLoading: manualLoading,
    error: manualError,
  } = useQuery<ManualEvent[]>({
    queryKey: ['manual-events'],
    queryFn: async () => {
      const response = await fetch('/api/manual-events', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? 'Failed to fetch manual events');
      }
      const events = body.data;
      if (!Array.isArray(events)) return [];
      return events as ManualEvent[];
    },
    staleTime: 60 * 1000,
  });

  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/cities', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) return [];
      return Array.isArray(body.data) ? (body.data as CityOption[]) : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const matchCity = useMemo<CityMatcher>(
    () =>
      buildCityMatcher(
        (cities ?? []).map((city) => ({
          slug: city.slug,
          name: city.name,
          aliases: city.aliases ?? [],
        }))
      ),
    [cities]
  );

  const publicEvents = useMemo(() => {
    const diceEvents = eventsData?.events ?? [];
    const dicePublic = diceEvents.map((event) =>
      toPublicEvent(event, matchCity)
    );

    const manualPublic: PublicEvent[] =
      manualEvents?.map((evt, index) => ({
        id: evt.id ?? `manual-${index}-${evt.title}`,
        title: evt.title,
        description: null,
        start: parseManualEventDate(evt.date),
        end: parseManualEventDate(evt.endDate),
        poster: evt.thumbnailUrl || null,
        location: evt.city,
        ticketsUrl: evt.rsvpLink,
        mapsUrl: evt.mapsLink || EVENTS_MAP_HREF,
        isManual: true,
        hostedByIrl: evt.hosted ?? false,
        citySlug: evt.citySlug ?? matchCity(evt.city),
      })) ?? [];

    return [...dicePublic, ...manualPublic];
  }, [eventsData?.events, manualEvents, matchCity]);

  const visibleEvents = useMemo(() => {
    const from = dateFrom ? parseManualEventDate(dateFrom) : null;
    const to = dateTo ? parseManualEventDate(dateTo) : null;
    const fromMs = from ? startOfDayMs(from) : null;
    const toMs = to ? startOfDayMs(to) : null;

    return publicEvents.filter((event) => {
      if (selectedCity !== 'all' && event.citySlug !== selectedCity) {
        return false;
      }
      // Date range overlap (inclusive). A single bound acts as open-ended.
      if (fromMs !== null || toMs !== null) {
        if (!event.start) return false;
        const startMs = startOfDayMs(event.start);
        const endMs = event.end ? startOfDayMs(event.end) : startMs;
        if (fromMs !== null && endMs < fromMs) return false;
        if (toMs !== null && startMs > toMs) return false;
      }
      return true;
    });
  }, [publicEvents, selectedCity, dateFrom, dateTo]);

  const nextEvent = useMemo(() => {
    const upcomingWithDate = visibleEvents
      .filter((event) => event.start && isTodayOrFuture(event.start))
      .sort((a, b) => a.start!.getTime() - b.start!.getTime());
    return upcomingWithDate[0] ?? null;
  }, [visibleEvents]);

  const remainingUpcomingEvents = useMemo(() => {
    const upcoming = visibleEvents.filter((event) =>
      isTodayOrFuture(eventStatusDate(event))
    );
    const withoutNext = nextEvent
      ? upcoming.filter((event) => event.id !== nextEvent.id)
      : upcoming;

    return [...withoutNext].sort((a, b) => {
      if (!a.start && !b.start) return a.title.localeCompare(b.title);
      if (!a.start) return 1;
      if (!b.start) return -1;
      const cmp = a.start.getTime() - b.start.getTime();
      return dateSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [nextEvent, visibleEvents, dateSortOrder]);

  const pastEvents = useMemo(() => {
    const onlyPast = visibleEvents.filter(
      (event) =>
        event.start &&
        !isTodayOrFuture(eventStatusDate(event)) &&
        // IRL allowlist: past events only render when hosted by IRL.
        event.hostedByIrl
    );
    return [...onlyPast].sort((a, b) => {
      const cmp = a.start!.getTime() - b.start!.getTime();
      return dateSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [visibleEvents, dateSortOrder]);

  const hasActiveFilters =
    selectedCity !== 'all' || Boolean(dateFrom) || Boolean(dateTo);

  const dateRangeLabel = (() => {
    const from = dateFrom ? parseManualEventDate(dateFrom) : null;
    const to = dateTo ? parseManualEventDate(dateTo) : null;
    if (from && to) return formatEventDateChip(from, to);
    if (from) return `From ${formatDateChip(from)}`;
    if (to) return `Until ${formatDateChip(to)}`;
    return 'All dates';
  })();

  const hasNoEvents =
    !isLoading &&
    !manualLoading &&
    !error &&
    !manualError &&
    !nextEvent &&
    remainingUpcomingEvents.length === 0 &&
    pastEvents.length === 0;

  return (
    <div className="min-h-screen bg-white px-4 pt-4 font-grotesk md:px-2">
      <div className="mx-auto max-w-md">
        <MapNav className={MAP_NAV_MOBILE_FLUSH_X} />

        <div className="space-y-3 pt-3">
          {(isLoading || manualLoading) && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[26px] border border-white/30 bg-white/45 px-6 py-8 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-700" />
              <p className="mt-3 body-small text-neutral-700">
                Loading events...
              </p>
            </div>
          )}

          {(error || manualError) && (
            <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-4 py-5">
              <p className="body-small text-rose-700">
                {error instanceof Error
                  ? error.message
                  : manualError instanceof Error
                    ? manualError.message
                    : 'Unable to load events right now.'}
              </p>
            </div>
          )}

          {nextEvent && (
            <section className="space-y-2">
              <article
                className={cn(
                  'overflow-hidden backdrop-blur-sm max-md:-mx-4 md:w-full md:max-w-none',
                  'max-md:w-[calc(100%+2rem)]'
                )}
              >
                {nextEvent.poster ? (
                  <Image
                    src={nextEvent.poster}
                    alt={nextEvent.title}
                    width={768}
                    height={960}
                    className="h-auto w-full object-cover transition-opacity hover:opacity-95"
                  />
                ) : (
                  <div className="flex aspect-[4/5] flex-col items-center justify-center border-b border-dashed border-neutral-400/60 bg-neutral-100">
                    <Calendar className="h-8 w-8 text-neutral-500" />
                  </div>
                )}

                <div
                  className={cn(
                    'flex w-full max-md:w-[393px] max-md:max-w-full flex-col items-start gap-4 py-6',
                    'max-md:mx-auto',
                    'md:max-w-none'
                  )}
                >
                  <div className="text-[#757575] label-small">NEXT EVENT</div>
                  <div className="space-y-3">
                    <h2 className=" text-[#313131]">{nextEvent.title}</h2>
                  </div>

                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={EVENT_META_PILL_FEATURED_CLASS}>
                        <Calendar className="size-3 shrink-0 text-[#757575]" />
                        <span className="whitespace-nowrap text-[11px] uppercase leading-none tracking-wide text-[#757575]">
                          {formatEventDateChip(nextEvent.start, nextEvent.end)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          EVENT_META_PILL_FEATURED_CLASS,
                          'min-w-0 max-w-[11rem]'
                        )}
                      >
                        <MapPin className="size-3 shrink-0 text-[#757575]" />
                        <span className="truncate text-[11px] uppercase leading-none tracking-wide text-[#757575]">
                          {nextEvent.location}
                        </span>
                      </div>
                    </div>
                    <EventsMapLink
                      href={nextEvent.mapsUrl || EVENTS_MAP_HREF}
                    />
                  </div>

                  <div className="w-full">
                    <a
                      href={nextEvent.ticketsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={FIND_TICKETS_CTA_CLASS}
                    >
                      <span className="text-left">REGISTER</span>
                      <span
                        className={REGISTER_ICON_CIRCLE_LIGHT_CLASS}
                        aria-hidden
                      >
                        <Image
                          src={REGISTER_ARROW_PATH}
                          alt=""
                          width={24}
                          height={24}
                          className="size-4 object-contain"
                        />
                      </span>
                    </a>
                  </div>
                </div>
              </article>
            </section>
          )}

          <div className="flex items-stretch gap-2">
            {cities && cities.length > 0 && (
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger
                  aria-label="Filter events by city"
                  className="flex h-10 flex-1 items-center justify-between rounded-none border-0 bg-[#a9a9a9] px-4 shadow-none transition-colors hover:bg-[#3a3a3a] focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden"
                >
                  <span className="truncate label-small uppercase tracking-wide text-black">
                    <SelectValue placeholder="All cities" />
                  </span>
                  <MapPin className="size-6 shrink-0 text-black" aria-hidden />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.slug}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div
              className="relative flex flex-1 items-stretch"
              ref={dateMenuRef}
            >
              <button
                type="button"
                aria-label="Filter events by date range"
                aria-expanded={dateOpen}
                onClick={() => setDateOpen((open) => !open)}
                className="flex h-10 w-full items-center justify-between rounded-none border-0 bg-[#a9a9a9] px-4 transition-colors hover:bg-[#3a3a3a]"
              >
                <span className="truncate label-small uppercase tracking-wide text-black">
                  {dateRangeLabel}
                </span>
                <Calendar className="size-6 shrink-0 text-black" aria-hidden />
              </button>

              {dateOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] space-y-3 border border-[#454545] bg-white p-3 shadow-lg">
                  <label className="block">
                    <span className="label-small uppercase tracking-wide text-[#757575]">
                      From
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1 w-full rounded-none border border-neutral-300 px-2 py-1.5 text-sm text-[#171717]"
                    />
                  </label>
                  <label className="block">
                    <span className="label-small uppercase tracking-wide text-[#757575]">
                      To
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1 w-full rounded-none border border-neutral-300 px-2 py-1.5 text-sm text-[#171717]"
                    />
                  </label>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="label-small uppercase tracking-wide text-[#757575] underline hover:text-black"
                    >
                      Clear dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateOpen(false)}
                      className="label-small uppercase tracking-wide text-black underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="label-small uppercase tracking-wide text-[#757575] underline hover:text-black"
            >
              Clear filters
            </button>
          )}

          {remainingUpcomingEvents.length > 0 && (
            <section className="space-y-2">
              <div className="space-y-2">
                {remainingUpcomingEvents.map((event) => (
                  <article
                    key={event.id}
                    className=" border-t border-solid bg-[var(--Text-Primary-CTA,#FFF)]  py-4 [border-top-color:var(--Text-Secondary-Text,#757575)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-[#313131]">{event.title}</h3>
                        {event.description && (
                          <p className="line-clamp-2 body-small text-[#666]">
                            {event.description}
                          </p>
                        )}
                      </div>
                      {event.poster ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPoster(event.poster)}
                          className="overflow-hidden"
                        >
                          <Image
                            src={event.poster}
                            alt={event.title}
                            width={101}
                            height={126}
                            className={EVENT_LIST_POSTER_IMAGE_CLASS}
                          />
                        </button>
                      ) : (
                        <div className={EVENT_LIST_POSTER_PLACEHOLDER_CLASS}>
                          <Calendar className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex w-full items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className={EVENT_META_PILL_LIST_CLASS}>
                          <Calendar className="size-3 shrink-0 text-neutral-500" />
                          <span className="whitespace-nowrap text-[11px] uppercase leading-none text-[#565656]">
                            {formatEventDateChip(event.start, event.end)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            EVENT_META_PILL_LIST_CLASS,
                            'min-w-0 max-w-[10rem]'
                          )}
                        >
                          <MapPin className="size-3 shrink-0 text-neutral-500" />
                          <span className="truncate text-[11px] uppercase leading-none text-[#565656]">
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <EventsMapLink href={event.mapsUrl || EVENTS_MAP_HREF} />
                    </div>

                    <div className="mt-3 w-full">
                      <a
                        href={event.ticketsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={UPCOMING_REGISTER_CTA_CLASS}
                      >
                        <span className="text-left">REGISTER</span>
                        <span
                          className={REGISTER_ICON_CIRCLE_DARK_CLASS}
                          aria-hidden
                        >
                          <Image
                            src={REGISTER_ARROW_PATH}
                            alt=""
                            width={24}
                            height={24}
                            className="size-4 object-contain invert"
                          />
                        </span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section className="space-y-2 pt-2">
              <h2 className={SECTION_TITLE_CLASS}>PAST EVENTS</h2>
              <div className="space-y-2">
                {pastEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-[24px] border border-neutral-200/80 bg-white/80 px-4 py-4 opacity-80"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-[#313131]">{event.title}</h3>
                        {event.description && (
                          <p className="line-clamp-2 body-small text-[#666]">
                            {event.description}
                          </p>
                        )}
                      </div>
                      {event.poster ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPoster(event.poster)}
                          className="overflow-hidden"
                        >
                          <Image
                            src={event.poster}
                            alt={event.title}
                            width={101}
                            height={126}
                            className={EVENT_LIST_POSTER_IMAGE_CLASS}
                          />
                        </button>
                      ) : (
                        <div className={EVENT_LIST_POSTER_PLACEHOLDER_CLASS}>
                          <Calendar className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex w-full items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className={EVENT_META_PILL_LIST_CLASS}>
                          <Calendar className="size-3 shrink-0 text-neutral-500" />
                          <span className="whitespace-nowrap text-[11px] uppercase leading-none text-[#565656]">
                            {formatEventDateChip(event.start, event.end)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            EVENT_META_PILL_LIST_CLASS,
                            'min-w-0 max-w-[10rem]'
                          )}
                        >
                          <MapPin className="size-3 shrink-0 text-neutral-500" />
                          <span className="truncate text-[11px] uppercase leading-none text-[#565656]">
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <EventsMapLink href={event.mapsUrl || EVENTS_MAP_HREF} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {hasNoEvents && (
            <div className="flex flex-col items-center justify-center rounded-[26px] bg-white px-5 py-10 text-center shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <CalendarX2 className="h-6 w-6 text-neutral-500" />
              </div>
              {hasActiveFilters ? (
                <>
                  <h3 className="title2 text-[#313131]">No matching events</h3>
                  <p className="mt-2 body-small text-[#6B6B6B]">
                    No events match your current filters. Try a different city
                    or date range.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 label-small uppercase tracking-wide text-[#171717] underline hover:opacity-70"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h3 className="title2 text-[#313131]">No Events Available</h3>
                  <p className="mt-2 body-small text-[#6B6B6B]">
                    Check back soon for upcoming events.
                  </p>
                </>
              )}
            </div>
          )}

          {eventsData?.pageInfo.hasNextPage && !isLoading && (
            <p className="px-2 text-[11px] uppercase tracking-wide text-black/55">
              Showing latest events. More are available on DICE.
            </p>
          )}

          <div className="h-20" />
        </div>
      </div>

      <Dialog
        open={Boolean(selectedPoster)}
        onOpenChange={(open) => {
          if (!open) setSelectedPoster(null);
        }}
      >
        <DialogContent className="h-screen w-screen max-h-screen max-w-screen sm:h-[90vh] sm:w-[90vw] sm:max-h-[90vh] sm:max-w-[90vw] border-none p-0 shadow-none [&>button]:hidden flex items-center justify-center bg-black">
          <DialogTitle className="sr-only">Event Poster</DialogTitle>
          <DialogDescription className="sr-only">
            Full-size event poster preview
          </DialogDescription>
          {selectedPoster && (
            <div className="flex h-full w-full flex-col">
              <div className="mb-1 flex w-full justify-center rounded-3xl border border-[#131313]/10 bg-white/80 px-4 py-3 backdrop-blur-sm">
                <DialogClose asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100">
                    <span className="sr-only">Close</span>
                    <Image
                      src="/x-close.svg"
                      alt="Close"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                    />
                  </button>
                </DialogClose>
              </div>

              {/* Card with blurred poster background and sharp poster on top */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden border border-[#131313]/10">
                {/* Blurred background inside the card */}
                <Image
                  src={selectedPoster}
                  alt=""
                  fill
                  className="object-cover blur-md opacity-40 scale-110"
                />

                {/* Foreground poster */}
                <div className="relative flex max-h-full max-w-full items-center justify-center p-4 sm:p-6">
                  <Image
                    src={selectedPoster}
                    alt="Event poster"
                    width={900}
                    height={1200}
                    className="h-auto max-h-[80vh] w-auto max-w-full object-contain shadow-2xl"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
