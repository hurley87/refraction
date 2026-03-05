"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CalendarX2,
  Loader2,
  MapPin,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import MapNav from "@/components/map/mapnav";
import type { DiceEvent, DiceImage, DiceVenue } from "@/lib/dice";

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
  poster: string | null;
  location: string;
  ticketsUrl: string;
}

type SortBy = "date" | "title";

const SECTION_TITLE_CLASS = "px-2 text-black body-small font-monument-grotesk";

const parseEventDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPoster = (images: DiceImage[] | null | undefined): string | null => {
  if (!images || images.length === 0) return null;
  const preferred = images.find((image) => image.type === "SQUARE") ?? images[0];
  return preferred?.url ?? null;
};

const getLocation = (venue: DiceVenue | undefined): string => {
  if (!venue) return "Location TBA";
  const cityCountry = [venue.city, venue.country].filter(Boolean).join(", ");
  return cityCountry || venue.name || "Location TBA";
};

const EVENTS_MAP_HREF = "/interactive-map";

const getTicketsUrl = (eventName: string): string =>
  `https://dice.fm/search?q=${encodeURIComponent(eventName)}`;

const formatDateChip = (date: Date | null): string => {
  if (!date) return "DATE TBA";
  const month = date
    .toLocaleString("en-US", { month: "short" })
    .slice(0, 3)
    .toUpperCase();
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month} ${day}/${year}`;
};

const isTodayOrFuture = (date: Date | null): boolean => {
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
};

const toPublicEvent = (event: DiceEvent): PublicEvent => {
  const primaryVenue = event.venues?.[0];
  return {
    id: event.id,
    title: event.name,
    description: event.description ?? null,
    start: parseEventDate(event.startDatetime),
    poster: getPoster(event.images),
    location: getLocation(primaryVenue),
    ticketsUrl: getTicketsUrl(event.name),
  };
};

export default function EventsPage() {
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery<EventsResponse>({
    queryKey: ["public-dice-events"],
    queryFn: async () => {
      const response = await fetch("/api/dice/events");
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? "Failed to fetch events");
      }
      return body.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const publicEvents = useMemo(() => {
    const events = eventsData?.events ?? [];
    return events.map(toPublicEvent);
  }, [eventsData?.events]);

  const nextEvent = useMemo(() => {
    const upcomingWithDate = publicEvents
      .filter((event) => event.start && isTodayOrFuture(event.start))
      .sort((a, b) => (a.start!.getTime() - b.start!.getTime()));
    return upcomingWithDate[0] ?? null;
  }, [publicEvents]);

  const remainingUpcomingEvents = useMemo(() => {
    const upcoming = publicEvents.filter((event) => isTodayOrFuture(event.start));
    const withoutNext = nextEvent
      ? upcoming.filter((event) => event.id !== nextEvent.id)
      : upcoming;

    return [...withoutNext].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (!a.start && !b.start) return a.title.localeCompare(b.title);
      if (!a.start) return 1;
      if (!b.start) return -1;
      return a.start.getTime() - b.start.getTime();
    });
  }, [nextEvent, publicEvents, sortBy]);

  const pastEvents = useMemo(() => {
    const onlyPast = publicEvents.filter(
      (event) => event.start && !isTodayOrFuture(event.start)
    );
    return [...onlyPast].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return b.start!.getTime() - a.start!.getTime();
    });
  }, [publicEvents, sortBy]);

  const hasNoEvents =
    !isLoading &&
    !error &&
    !nextEvent &&
    remainingUpcomingEvents.length === 0 &&
    pastEvents.length === 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(0deg,_#61BFD1_0%,_#EE91B7_26.92%,_#FFE600_54.33%,_#1BA351_100%)] px-2 pb-20 pt-4 font-grotesk">
      <div className="mx-auto max-w-md">
        <MapNav />

        <div className="space-y-3 pt-3">
          {isLoading && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[26px] border border-white/30 bg-white/45 px-6 py-8 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-700" />
              <p className="mt-3 body-small text-neutral-700">
                Loading events...
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-4 py-5">
              <p className="body-small text-rose-700">
                {error instanceof Error
                  ? error.message
                  : "Unable to load events right now."}
              </p>
            </div>
          )}

          {nextEvent && (
            <section className="space-y-2">
              <h2 className={SECTION_TITLE_CLASS}>NEXT EVENT</h2>
              <article className="rounded-[26px] border border-white/30 bg-white/45 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <div className="space-y-4">
                  {nextEvent.poster ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPoster(nextEvent.poster)}
                      className="w-full overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                    >
                      <Image
                        src={nextEvent.poster}
                        alt={nextEvent.title}
                        width={768}
                        height={960}
                        className="h-auto w-full object-cover transition-opacity hover:opacity-95"
                      />
                    </button>
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl border border-dashed border-neutral-400/60 bg-white/40">
                      <Calendar className="h-8 w-8 text-neutral-500" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="title2 text-[#313131]">{nextEvent.title}</h3>
                    {nextEvent.description && (
                      <p className="line-clamp-3 body-small text-[#4F4F4F]">
                        {nextEvent.description}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-black/25 bg-white/70 px-3 py-1.5">
                      <Calendar className="h-4 w-4 shrink-0 text-neutral-600" />
                      <span className="truncate text-[11px] uppercase tracking-wide text-black">
                        {formatDateChip(nextEvent.start)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-black/25 bg-white/70 px-3 py-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-neutral-600" />
                      <span className="truncate text-[11px] uppercase tracking-wide text-black">
                        {nextEvent.location}
                      </span>
                    </div>
                    <Link
                      href={EVENTS_MAP_HREF}
                      className="rounded-full bg-white px-3 py-2 text-[11px] uppercase tracking-wide text-black transition-colors hover:bg-white/80"
                    >
                      Map
                    </Link>
                  </div>

                  <a
                    href={nextEvent.ticketsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-full items-center justify-between rounded-full bg-white px-4 font-pleasure text-black transition-colors hover:bg-neutral-100"
                  >
                    <span className="leading-none">Find Tickets</span>
                    <Ticket className="h-4 w-4" />
                  </a>
                </div>
              </article>
            </section>
          )}

          {remainingUpcomingEvents.length > 0 && (
            <section className="space-y-2">
              <h2 className={SECTION_TITLE_CLASS}>UPCOMING EVENTS</h2>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
                className="flex h-10 w-full items-center justify-between rounded-full bg-white px-4 transition-colors hover:bg-neutral-50"
              >
                <span className="body-small uppercase tracking-wide text-[#5E5E5E]">
                  Sort by {sortBy === "date" ? "title" : "date"}
                </span>
                <SlidersHorizontal className="h-4 w-4 text-[#5E5E5E]" />
              </button>

              <div className="space-y-2">
                {remainingUpcomingEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-[24px] border border-white/80 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <h3 className="title3 text-[#313131]">{event.title}</h3>
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
                          className="overflow-hidden rounded-xl"
                        >
                          <Image
                            src={event.poster}
                            alt={event.title}
                            width={84}
                            height={108}
                            className="h-[108px] w-[84px] rounded-xl object-cover transition-opacity hover:opacity-90"
                          />
                        </button>
                      ) : (
                        <div className="flex h-[108px] w-[84px] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                          <Calendar className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                        <span className="truncate text-[11px] uppercase text-[#565656]">
                          {formatDateChip(event.start)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                        <span className="truncate text-[11px] uppercase text-[#565656]">
                          {event.location}
                        </span>
                      </div>
                      <Link
                        href={EVENTS_MAP_HREF}
                        className="rounded-full bg-neutral-100 px-3 py-2 text-[11px] uppercase tracking-wide text-[#4C4C4C] transition-colors hover:bg-neutral-200"
                      >
                        Map
                      </Link>
                    </div>

                    <a
                      href={event.ticketsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex h-10 w-full items-center justify-between rounded-full bg-neutral-100 px-4 text-black transition-colors hover:bg-neutral-200"
                    >
                      <span className="font-pleasure leading-none">Find Tickets</span>
                      <Ticket className="h-4 w-4" />
                    </a>
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
                        <h3 className="title3 text-[#313131]">{event.title}</h3>
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
                          className="overflow-hidden rounded-xl"
                        >
                          <Image
                            src={event.poster}
                            alt={event.title}
                            width={84}
                            height={108}
                            className="h-[108px] w-[84px] rounded-xl object-cover transition-opacity hover:opacity-90"
                          />
                        </button>
                      ) : (
                        <div className="flex h-[108px] w-[84px] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                          <Calendar className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                        <span className="truncate text-[11px] uppercase text-[#565656]">
                          {formatDateChip(event.start)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                        <span className="truncate text-[11px] uppercase text-[#565656]">
                          {event.location}
                        </span>
                      </div>
                      <Link
                        href={EVENTS_MAP_HREF}
                        className="rounded-full bg-neutral-100 px-3 py-2 text-[11px] uppercase tracking-wide text-[#4C4C4C] transition-colors hover:bg-neutral-200"
                      >
                        Map
                      </Link>
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
              <h3 className="title2 text-[#313131]">No Events Available</h3>
              <p className="mt-2 body-small text-[#6B6B6B]">
                Check back soon for upcoming events.
              </p>
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
        <DialogContent
          className="h-[95vh] max-h-[95vh] w-[95vw] max-w-[95vw] border-none p-0 shadow-none [&>button]:hidden"
          style={{ backgroundColor: "black" }}
        >
          <DialogTitle className="sr-only">Event Poster</DialogTitle>
          <DialogDescription className="sr-only">
            Full-size event poster preview
          </DialogDescription>
          {selectedPoster && (
            <div className="flex h-full flex-col">
              <div className="mb-1 flex w-full justify-center rounded-3xl border border-[#131313]/10 bg-white px-4 py-3">
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

              <div className="flex flex-1 items-center justify-center overflow-auto rounded-3xl border border-[#131313]/10 bg-white p-6">
                <Image
                  src={selectedPoster}
                  alt="Event poster"
                  width={900}
                  height={1200}
                  className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
