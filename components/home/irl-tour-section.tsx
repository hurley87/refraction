'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin } from 'lucide-react';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import {
  getDiceEventPosterUrl,
  type DiceEvent,
  type DiceVenue,
} from '@/lib/dice';

const FALLBACK_POSTER_SRC = '/homepage/irl-tour-june.png';

const NEXT_EVENT_LABEL_CLASS =
  "font-['ABC_Monument_Grotesk_Semi-Mono_Unlicensed_Trial',sans-serif] text-[11px] font-medium uppercase leading-4 tracking-[0.44px] text-[#DBDBDB]";

const RIGHT_ARROW_PATH =
  'M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z';

const DESKTOP_CARD_MIN_WIDTH = 336.782;
const DESKTOP_CARD_GAP = 32;

export type HomepageFeaturedEvent = {
  title: string;
  thumbnailUrl: string;
  rsvpLink: string;
};

interface IRLTourSectionProps {
  featuredEvent?: HomepageFeaturedEvent | null;
  featuredDiceEventId?: string | null;
}

interface EventsResponse {
  events: DiceEvent[];
}

interface ManualEvent {
  id?: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  endDate?: string | null;
  city: string;
  rsvpLink: string;
  isFeatured?: boolean;
}

type CarouselEvent = {
  id: string;
  title: string;
  poster: string | null;
  start: Date | null;
  end: Date | null;
  location: string;
  ticketsUrl: string;
  isManual: boolean;
};

const parseEventDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

const getLocation = (venue: DiceVenue | undefined): string => {
  if (!venue) return 'Location TBA';
  const cityCountry = [venue.city, venue.country].filter(Boolean).join(', ');
  return cityCountry || venue.name || 'Location TBA';
};

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

const formatEventDateChip = (start: Date | null, end: Date | null): string => {
  if (!start) return 'DATE TBA';
  if (!end || isSameCalendarDay(start, end)) return formatDateChip(start);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${monthAbbr(start)} ${start.getDate()}–${end.getDate()}/${twoDigitYear(end)}`;
  }
  if (sameYear) {
    return `${monthAbbr(start)} ${start.getDate()}–${monthAbbr(end)} ${end.getDate()}/${twoDigitYear(end)}`;
  }
  return `${formatDateChip(start)}–${formatDateChip(end)}`;
};

const toDiceCarouselEvent = (event: DiceEvent): CarouselEvent => {
  const primaryVenue = event.venues?.[0];
  return {
    id: event.id,
    title: event.name,
    poster: getDiceEventPosterUrl(event.images),
    start: parseEventDate(event.startDatetime),
    end: parseEventDate(event.endDatetime),
    location: getLocation(primaryVenue),
    ticketsUrl: getTicketsUrl(event.name),
    isManual: false,
  };
};

const toManualCarouselEvent = (
  evt: ManualEvent,
  index: number
): CarouselEvent => ({
  id: evt.id ?? `manual-${index}-${evt.title}`,
  title: evt.title,
  poster: evt.thumbnailUrl || null,
  start: parseManualEventDate(evt.date),
  end: parseManualEventDate(evt.endDate),
  location: evt.city,
  ticketsUrl: evt.rsvpLink,
  isManual: true,
});

const getTicketPlatformLabel = (
  ticketsUrl: string,
  isManual: boolean
): string => {
  const url = ticketsUrl.toLowerCase();
  if (url.includes('ra.co') || url.includes('residentadvisor')) {
    return 'VIEW ON RA';
  }
  if (url.includes('dice.fm') || !isManual) {
    return 'VIEW ON DICE';
  }
  return 'VIEW ON DICE';
};

function DiagonalArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M13.1862 2.81317V10.2468H11.2604L11.4205 6.48407L11.4362 6.10712L11.1696 6.37469L4.4469 13.1247L2.87268 11.5485L9.60803 4.80243L9.87561 4.53485L9.49768 4.55243L5.76721 4.72333V2.81317H13.1862Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.29358"
      />
    </svg>
  );
}

function RightArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d={RIGHT_ARROW_PATH} fill="currentColor" />
    </svg>
  );
}

/** Desktop title-row link to the events page. */
function ViewAllEventsLink() {
  return (
    <Link
      href="/events"
      className="inline-flex h-5 shrink-0 items-center gap-2 border-b border-solid border-[#FFF]"
    >
      <span className="label-large whitespace-nowrap uppercase text-white">
        View All Events
      </span>
      <RightArrowIcon className="h-4 w-4 shrink-0 text-white" />
    </Link>
  );
}

function EventCarouselCard({ event }: { event: CarouselEvent }) {
  const ticketsHref = event.ticketsUrl.trim() || '/events';
  const isExternal = ticketsHref.startsWith('http');

  return (
    <Link
      href={ticketsHref}
      className="flex min-w-0 flex-1 flex-col"
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <div className="relative h-[367.406px] w-full self-stretch overflow-hidden bg-[#1a1a1a]">
        {event.poster ? (
          <Image
            src={event.poster}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 1440px) 25vw, 360px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="size-8 text-[#DBDBDB]" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-4 self-stretch pt-4">
        <span className={NEXT_EVENT_LABEL_CLASS}>NEXT EVENT</span>

        <h3 className="text-left text-white">{event.title}</h3>

        <div className="label-small flex w-full items-center justify-between gap-2 self-stretch text-[#DBDBDB]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3 shrink-0" aria-hidden />
              {formatEventDateChip(event.start, event.end)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          </div>
          <span className="inline-flex h-4 shrink-0 items-center gap-[var(--sds-size-space-200)] border-b border-[#DBDBDB] whitespace-nowrap">
            {getTicketPlatformLabel(event.ticketsUrl, event.isManual)}
            <DiagonalArrowIcon className="size-[15px] shrink-0 text-[#DBDBDB]" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * IRL Tour section — homepage Upcoming Events poster.
 * Uses the admin-featured event (DICE or manual) when set; otherwise falls back to static art.
 */
export default function IRLTourSection({
  featuredEvent = null,
  featuredDiceEventId = null,
}: IRLTourSectionProps) {
  const posterSrc = featuredEvent?.thumbnailUrl?.trim() || FALLBACK_POSTER_SRC;
  const posterAlt = featuredEvent?.title?.trim() || 'IRL Tour poster';
  const rsvpHref = featuredEvent?.rsvpLink?.trim() || '';
  const posterHref = rsvpHref || '/events';
  const desktopBgImage = posterSrc;

  const { data: eventsData } = useQuery<EventsResponse>({
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

  const { data: manualEvents } = useQuery<ManualEvent[]>({
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

  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselFillCount, setCarouselFillCount] = useState(4);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const updateFillCount = () => {
      const width = el.clientWidth;
      const count = Math.max(
        1,
        Math.floor(
          (width + DESKTOP_CARD_GAP) /
            (DESKTOP_CARD_MIN_WIDTH + DESKTOP_CARD_GAP)
        )
      );
      setCarouselFillCount(count);
    };

    updateFillCount();
    const observer = new ResizeObserver(updateFillCount);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const carouselEvents = useMemo(() => {
    const featuredDiceEvents =
      featuredDiceEventId != null
        ? (eventsData?.events ?? [])
            .filter((event) => event.id === featuredDiceEventId)
            .map(toDiceCarouselEvent)
        : [];

    const featuredManualEvents =
      manualEvents
        ?.filter((event) => event.isFeatured)
        .map(toManualCarouselEvent) ?? [];

    const featured = [...featuredDiceEvents, ...featuredManualEvents].sort(
      (a, b) => {
        if (!a.start && !b.start) return a.title.localeCompare(b.title);
        if (!a.start) return 1;
        if (!b.start) return -1;
        return a.start.getTime() - b.start.getTime();
      }
    );

    if (featured.length > 0) return featured;

    if (featuredEvent?.title) {
      return [
        {
          id: 'featured-fallback',
          title: featuredEvent.title,
          poster: featuredEvent.thumbnailUrl || FALLBACK_POSTER_SRC,
          start: null,
          end: null,
          location: 'Location TBA',
          ticketsUrl: featuredEvent.rsvpLink || '/events',
          isManual: true,
        },
      ];
    }

    return [];
  }, [eventsData?.events, featuredDiceEventId, featuredEvent, manualEvents]);

  const displayedCarouselEvents = useMemo(() => {
    if (carouselEvents.length === 0) return [];

    return Array.from({ length: carouselFillCount }, (_, index) => {
      const event = carouselEvents[index % carouselEvents.length]!;
      return { event, key: `${event.id}-${index}` };
    });
  }, [carouselEvents, carouselFillCount]);

  return (
    <section className="relative w-full overflow-hidden bg-[#131313]">
      {/* Mobile + tablet layout */}
      <div className="relative px-4 pt-[128px] pb-16 md:py-24 xl:hidden">
        <div
          className="pointer-events-none absolute inset-x-4 top-0 bottom-0 bg-[#171717] bg-opacity-10 md:hidden"
          aria-hidden
        />

        <div className="mb-4 flex items-center gap-2">
          <WelcomeEllipse />
          <span className="title4 text-white">IRL Picks</span>
        </div>

        <h2 className="title1 relative z-10 flex items-left justify-left gap-2 self-stretch pb-12 text-white">
          Upcoming Events
        </h2>

        <div
          className="pointer-events-none absolute hidden h-[3499px] w-[2626px] opacity-70 md:block"
          style={{
            left: '-580px',
            bottom: '-1465px',
            aspectRatio: '373/497',
            background: `url(${desktopBgImage}) lightgray 50% / cover no-repeat`,
            filter: 'blur(59.4px)',
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[1177px] flex-col md:flex-row md:items-center md:gap-[200px]">
          <div className="order-2 flex min-w-0 flex-1 flex-col md:order-1 md:w-[574px] md:flex-none md:items-start md:gap-[35px]">
            <div className="mb-6 flex w-full items-center justify-center md:mb-0">
              <Link
                href="/events"
                className="inline-flex w-[361px] max-w-full shrink-0"
              >
                <button
                  type="button"
                  className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[#ffffff] py-2 pr-2 pl-4 uppercase text-[#171717]"
                >
                  <span className="whitespace-nowrap">Browse Events</span>
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                    aria-hidden
                  >
                    <path d={RIGHT_ARROW_PATH} fill="#171717" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>

          <Link
            href={posterHref}
            className="relative order-1 mb-12 block aspect-[3/4] w-full md:order-2 md:mb-0 md:w-[500px] md:shrink-0"
            {...(rsvpHref.startsWith('http')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            <Image
              src={posterSrc}
              alt={posterAlt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 500px"
              priority={false}
            />
          </Link>
        </div>
      </div>

      {/* Desktop layout — title row + event carousel */}
      <div className="hidden w-full flex-col items-center gap-8 self-stretch px-[var(--sds-size-space-0)] py-[120px] xl:flex">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-16">
          <div className="flex items-end justify-between self-stretch">
            <div className="flex h-[95px] flex-col items-start">
              <div className="flex w-[363px] items-center gap-2">
                <WelcomeEllipse />
                <span className="title4 text-white">IRL Picks</span>
              </div>
              <div className="flex items-center gap-2 py-4">
                <h2 className="title0 text-left text-white">Upcoming Events</h2>
              </div>
            </div>
            <ViewAllEventsLink />
          </div>

          <div
            ref={carouselRef}
            className="flex w-full items-start gap-8 self-stretch"
          >
            {displayedCarouselEvents.map(({ event, key }) => (
              <EventCarouselCard key={key} event={event} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
