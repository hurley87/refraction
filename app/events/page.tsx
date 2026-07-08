'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Loader2, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDrawerContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import MapNav, { MAP_NAV_MOBILE_FLUSH_X } from '@/components/map/mapnav';
import {
  MapDesktopNav,
  MapDesktopSearchSlot,
} from '@/components/map/map-desktop-nav';
import { cn } from '@/lib/utils';
import { buildCityMatcher } from '@/lib/utils/normalize-city';
import {
  getDiceEventPosterUrl,
  type DiceEvent,
  type DiceVenue,
} from '@/lib/dice';

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

type SortOrder = 'asc' | 'desc';
type FilterModalSection = 'location' | 'date' | null;

const SECTION_TITLE_CLASS = 'text-black body-small font-monument-grotesk';

const REGISTER_ARROW_PATH = '/right-arrow.svg';
const MAP_ARROW_PATH = '/home/arrow-right.svg';
const MAP_ARROW_DIAGONAL_PATH = '/arrow-diag-right-black-on-white.svg';

/** 24×24px circle, white fill — arrow icon sits inside. */
const REGISTER_ICON_CIRCLE_LIGHT_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white';

/** Featured REGISTER CTA (SDS: 44px bar, primary text fill, SDS padding). */
const FIND_TICKETS_CTA_CLASS =
  'flex h-11 min-h-[44px] w-full shrink-0 self-stretch items-center justify-between bg-[var(--Text-Primary-Text,#171717)] py-[var(--sds-size-space-200)] px-[var(--sds-size-space-400)] label-large uppercase tracking-wide text-[var(--Text-Primary-CTA,#FFF)]';

/** Desktop hero REGISTER CTA — 236×44 primary button. */
const EVENT_HERO_REGISTER_CTA_CLASS =
  'flex h-[44px] w-[236px] min-h-[44px] shrink-0 items-center gap-[var(--sds-size-space-400)] bg-[var(--Text-Primary-Text,#171717)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] label-large uppercase tracking-wide text-[var(--Text-Primary-CTA,#FFF)] transition-opacity hover:opacity-95';

/** Upcoming list REGISTER: gray bar, black label, arrow on black circle. */
const UPCOMING_REGISTER_CTA_CLASS =
  'flex h-11 min-h-[44px] w-full shrink-0 self-stretch items-center justify-between bg-[#DBDBDB] py-[var(--sds-size-space-200)] px-[var(--sds-size-space-400)] label-large uppercase tracking-wide text-black';

/** Arrow icon on black disc (upcoming cards). */
const REGISTER_ICON_CIRCLE_DARK_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black';

/** Date/location meta pills — flex, SDS padding/gap, secondary border. */
const EVENT_META_PILL_CLASS =
  'flex shrink-0 items-center justify-center gap-[var(--sds-size-space-050)] border border-solid border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-200)] py-[var(--sds-size-space-100)]';

/** List card poster thumb: 101×126px, aspect 97/121. */
const EVENT_LIST_POSTER_IMAGE_CLASS =
  'h-[126px] w-[101px] shrink-0 object-cover aspect-[97/121] transition-opacity hover:opacity-90';

const EVENT_LIST_POSTER_PLACEHOLDER_CLASS =
  'flex h-[126px] w-[101px] shrink-0 items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 aspect-[97/121]';

/** Desktop events grid card — 337px column, top border, SDS vertical padding. */
const EVENT_DESKTOP_CARD_CLASS =
  'flex w-[337px] flex-col items-center gap-[var(--sds-size-space-400)] border-t border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Text-Primary-CTA,#FFF)] pt-[var(--sds-size-space-600)] pb-[var(--sds-size-space-800)]';

/** Four 337px cards per row with 32px gap (1444px total). */
const EVENT_DESKTOP_GRID_CLASS =
  'grid w-[1444px] max-w-full grid-cols-[repeat(4,337px)] gap-x-8';

const EVENT_DESKTOP_CARD_POSTER_CLASS =
  'relative h-[127px] w-[102px] shrink-0 overflow-hidden bg-neutral-100 aspect-[102/127] transition-opacity hover:opacity-95';

/** Desktop card register row — 32px secondary bar. */
const EVENT_DESKTOP_CARD_REGISTER_CLASS =
  'flex h-8 w-full items-center justify-between gap-2 self-stretch bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-200)] py-[var(--sds-size-space-100)] label-large uppercase text-black transition-opacity hover:opacity-95';

function EventDesktopCard({
  event,
  onPosterClick,
  dimmed = false,
}: {
  event: PublicEvent;
  onPosterClick: (poster: string) => void;
  dimmed?: boolean;
}) {
  return (
    <article className={cn(EVENT_DESKTOP_CARD_CLASS, dimmed && 'opacity-80')}>
      {/* Row 1: title (left) + poster (right) */}
      <div className="flex w-full items-start gap-[var(--sds-size-space-400)]">
        <h3 className="min-w-0 flex-1 text-left text-[#313131]">
          {event.title}
        </h3>
        {event.poster ? (
          <button
            type="button"
            onClick={() => onPosterClick(event.poster!)}
            className={EVENT_DESKTOP_CARD_POSTER_CLASS}
          >
            <Image
              src={event.poster}
              alt={event.title}
              fill
              className="object-cover object-center"
              sizes="102px"
            />
          </button>
        ) : (
          <div
            className={cn(
              EVENT_DESKTOP_CARD_POSTER_CLASS,
              'flex items-center justify-center border border-dashed border-neutral-300'
            )}
          >
            <Calendar className="h-5 w-5 text-neutral-400" />
          </div>
        )}
      </div>

      {/* Row 2: pills (left) + map (right) */}
      <div className="flex w-full items-center justify-between gap-2 self-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className={EVENT_META_PILL_CLASS}>
            <Calendar className="size-3 shrink-0 text-neutral-500" />
            <span className="whitespace-nowrap text-[11px] uppercase leading-none text-[#565656]">
              {formatEventDateChip(event.start, event.end)}
            </span>
          </div>
          <div className={cn(EVENT_META_PILL_CLASS, 'min-w-0 max-w-[10rem]')}>
            <MapPin className="size-3 shrink-0 text-neutral-500" />
            <span className="truncate text-[11px] uppercase leading-none text-[#565656]">
              {event.location}
            </span>
          </div>
        </div>
        <EventsMapLink href={event.mapsUrl || EVENTS_MAP_HREF} arrow="grid" />
      </div>

      {/* Row 3: register */}
      <a
        href={event.ticketsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={EVENT_DESKTOP_CARD_REGISTER_CLASS}
      >
        <span className="text-left">REGISTER</span>
        <Image
          src={REGISTER_ARROW_PATH}
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0 object-contain"
          aria-hidden
        />
      </a>
    </article>
  );
}

/** Map control: 24px row, SDS gap, primary underline bar. */
const EVENT_MAP_LINK_CLASS =
  'flex h-6 shrink-0 items-center gap-[var(--sds-size-space-200)] border-b border-solid border-[var(--Text-Primary-Text,#171717)]';

/** Desktop hero MAP CTA — 116×44 secondary button. */
const EVENT_HERO_MAP_LINK_CLASS =
  'flex w-[116px] min-h-[44px] shrink-0 items-center gap-[var(--sds-size-space-400)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] transition-colors hover:bg-[#c9c9c9]';

/** Desktop events filter header — bordered bar with FILTER label + sort control. */
const EVENT_DESKTOP_FILTER_HEADER_CLASS =
  'flex h-12 shrink-0 flex-col justify-center self-stretch gap-4 border-y border-[var(--Text-Secondary-Text,#757575)] bg-[var(--Text-Primary-CTA,#FFF)] px-2 py-4';

function EventsSortIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M21 8.15416H3V5.51099H21V8.15416ZM18.0463 10.6784H5.95374V13.3216H18.0463V10.6784ZM14.8711 15.8458H9.13216V18.489H14.8711V15.8458Z"
        fill="#757575"
      />
    </svg>
  );
}

function EventsFilterCloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M19.9986 7.32025L16.7198 4L12.012 8.69045L7.32159 4L4.00134 7.32025L8.69526 11.9969L4.00134 16.6735L7.32159 19.9938L12.012 15.3033L16.7198 19.9938L19.9986 16.6735L15.3185 11.9969L19.9986 7.32025Z"
        fill="#A9A9A9"
      />
    </svg>
  );
}

function EventsFilterDropdownIcon({
  className,
  expanded = false,
}: {
  className?: string;
  expanded?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <path
        d={
          expanded
            ? 'M16.2857 12.1408L13.3917 8.81502V20H10.6083V8.81502L7.71429 12.1408L6 10.3343L12.0107 4L18 10.3343L16.2857 12.1408Z'
            : 'M17 11.8415L13.6237 15.5831V3H10.3763V15.5831L7 11.8415L5 13.8739L12.0125 21L19 13.8739L17 11.8415Z'
        }
        fill="#757575"
      />
    </svg>
  );
}

function EventsFilterClearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-5 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M19.9986 7.32025L16.7198 4L12.012 8.69045L7.32159 4L4.00134 7.32025L8.69526 11.9969L4.00134 16.6735L7.32159 19.9938L12.012 15.3033L16.7198 19.9938L19.9986 16.6735L15.3185 11.9969L19.9986 7.32025Z"
        fill="#000000"
      />
    </svg>
  );
}

type AppliedFilter = { key: string; label: string; onClear: () => void };

/** Single applied-filter chip: label + black clear X (events filter bar). */
function EventsFilterChip({ label, onClear }: Omit<AppliedFilter, 'key'>) {
  return (
    <span className="flex items-center gap-[var(--sds-size-space-050)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)]">
      <span className="label-small uppercase text-[#171717]">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="flex shrink-0 items-center transition-opacity hover:opacity-80"
      >
        <EventsFilterClearIcon className="size-4" />
      </button>
    </span>
  );
}

/** Applied-filter count + chips, rendered next to FILTER in the filter bar. */
function EventsAppliedFilters({ filters }: { filters: AppliedFilter[] }) {
  if (filters.length === 0) return null;
  return (
    <>
      <span className="label-small text-[#171717]">({filters.length})</span>
      {filters.map((filter) => (
        <EventsFilterChip
          key={filter.key}
          label={filter.label}
          onClear={filter.onClear}
        />
      ))}
    </>
  );
}

function EventsFilterCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M16.4784 3L10.1656 16.9722L7.36378 11.0311L2.90625 11.0054L7.43119 20H8.83614H11.9211H13.264L20.9062 3H16.4784Z"
        fill="white"
      />
    </svg>
  );
}

function EventsSortAscIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={19}
      height={14}
      viewBox="0 0 19 14"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d="M18.0459 13.5H0L0.0458984 11H18.0459V13.5ZM12.0925 5.5H0V8.14317H12.0925V5.5ZM5.9174 0H0L0.0458984 2.5H5.96329L5.9174 0Z"
        fill="#757575"
      />
    </svg>
  );
}

function EventsSortDescIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d="M21 8.15419H2.99999V5.51102H21V8.15419ZM15.0462 10.6784H2.95374V13.3216H15.0462V10.6784ZM8.87113 15.8458H3.13215V18.489H8.87113V15.8458Z"
        fill="#757575"
      />
    </svg>
  );
}

const SORT_ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

/** Filter drawer/modal row — location, date, sort (47px, SDS padding, white bg). */
const EVENT_FILTER_ROW_CLASS =
  'flex h-[47px] w-full shrink-0 self-stretch items-center justify-between bg-[var(--Backgrounds-Background,#FFF)] py-4 px-[var(--sds-size-space-600)]';

function compareEvents(
  a: PublicEvent,
  b: PublicEvent,
  sortOrder: SortOrder
): number {
  let cmp = 0;

  if (!a.start && !b.start) cmp = a.title.localeCompare(b.title);
  else if (!a.start) cmp = 1;
  else if (!b.start) cmp = -1;
  else cmp = a.start.getTime() - b.start.getTime();

  return sortOrder === 'asc' ? cmp : -cmp;
}

interface EventsFilterSortProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cities: CityOption[] | undefined;
  selectedCity: string;
  onSelectedCityChange: (city: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  dateRangeLabel: string;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

type EventsFilterSortFieldsProps = Omit<
  EventsFilterSortProps,
  'open' | 'onOpenChange'
> & {
  /** Rendered flush below the last sort row (e.g. the Save button). */
  saveSlot?: ReactNode;
};

/** Shared filter body: location + date accordions and sort order (modal + drawer). */
function EventsFilterSortFields({
  cities,
  selectedCity,
  onSelectedCityChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  dateRangeLabel,
  sortOrder,
  onSortOrderChange,
  
  
  saveSlot,
}: EventsFilterSortFieldsProps) {
  const [expandedSection, setExpandedSection] =
    useState<FilterModalSection>(null);

  const selectedCityLabel =
    selectedCity === 'all'
      ? 'All cities'
      : (cities?.find((city) => city.slug === selectedCity)?.name ??
        'All cities');

  const toggleSection = (section: Exclude<FilterModalSection, null>) => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  return (
    <>
      <div className="flex flex-col">
        <div>
          <button
            type="button"
            aria-expanded={expandedSection === 'location'}
            onClick={() => toggleSection('location')}
            className={cn(
              EVENT_FILTER_ROW_CLASS,
              'label-small uppercase tracking-wide text-[#757575] transition-opacity hover:opacity-80 border-b border-[#a9a9a9]'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[#171717] label-large uppercase">
                {selectedCity === 'all' ? 'Location' : selectedCityLabel}
              </span>
            </span>
            <EventsFilterDropdownIcon
              expanded={expandedSection === 'location'}
            />
          </button>

          {expandedSection === 'location' && cities && cities.length > 0 && (
            <div className="flex flex-col border-t border-[#DBDBDB]">
              {cities.map((city) => {
                const isSelected = selectedCity === city.slug;
                return (
                  <div
                    key={city.id}
                    className={cn(
                      'flex items-center self-stretch',
                      isSelected && 'bg-[#dbdbdb]'
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        onSelectedCityChange(city.slug);
                        setExpandedSection(null);
                      }}
                      className={cn(
                        'flex grow basis-0 shrink-0 items-center py-[var(--sds-size-space-300)] pl-4 pr-0 label-medium uppercase tracking-wide transition-opacity hover:opacity-80',
                        isSelected ? 'text-black' : 'text-[#a9a9a9]'
                      )}
                    >
                      {city.name}
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectedCityChange('all');
                          setExpandedSection(null);
                        }}
                        aria-label={`Clear ${city.name} filter`}
                        className="flex shrink-0 items-center px-4 py-[var(--sds-size-space-300)] transition-opacity hover:opacity-80"
                      >
                        <EventsFilterClearIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            aria-expanded={expandedSection === 'date'}
            onClick={() => toggleSection('date')}
            className={cn(
              EVENT_FILTER_ROW_CLASS,
              'label-small uppercase tracking-wide text-[#757575] transition-opacity hover:opacity-80 border-b border-[#a9a9a9]'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[#171717] label-large uppercase">
                {dateFrom || dateTo ? dateRangeLabel : 'Date Range'}
              </span>
            </span>
            <EventsFilterDropdownIcon expanded={expandedSection === 'date'} />
          </button>

          {expandedSection === 'date' && (
            <div className="space-y-3 border-t border-[#DBDBDB] bg-[var(--Backgrounds-Background,#FFF)] px-[var(--sds-size-space-600)] py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label-small uppercase tracking-wide text-[#757575]">
                    From
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => onDateFromChange(e.target.value)}
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
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="mt-1 w-full rounded-none border border-neutral-300 px-2 py-1.5 text-sm text-[#171717]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  onDateFromChange('');
                  onDateToChange('');
                }}
                className="label-small uppercase tracking-wide text-[#757575] underline hover:text-black"
              >
                Clear dates
              </button>
            </div>
          )}
        </div>

        {SORT_ORDER_OPTIONS.map(({ value, label }) => {
          const isSelected = sortOrder === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSortOrderChange(value)}
              className={cn(
                EVENT_FILTER_ROW_CLASS,
                'uppercase tracking-wide transition-opacity hover:opacity-80 border-b border-[#a9a9a9]',
                isSelected && 'bg-[#dbdbdb]'
              )}
            >
              <span className="flex items-baseline gap-[8px]">
                <span className="label-large text-black">Date</span>
                <span className="label-medium truncate text-[#A9A9A9]">
                  {label}
                </span>
              </span>
              {value === 'asc' ? <EventsSortAscIcon /> : <EventsSortDescIcon />}
            </button>
          );
        })}

        {saveSlot}
      </div>
    </>
  );
}

/** Shared Save row — flush below the last filter row. */
const EventsFilterSaveButton = (
  <DialogClose asChild>
    <button
      type="button"
      className={cn(
        EVENT_FILTER_ROW_CLASS,
        'label-large uppercase tracking-wide bg-black text-white transition-opacity hover:opacity-95'
      )}
    >
      Save
      <EventsFilterCheckIcon />
    </button>
  </DialogClose>
);

/** Desktop: centered modal launched from the FILTER + sort header. */
function EventsFilterSortModal({
  open,
  onOpenChange,
  ...fields
}: EventsFilterSortProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-full max-w-md gap-6 overflow-hidden border border-[#DBDBDB] bg-white p-0 pt-6 shadow-lg sm:rounded-none"
      >
        <div className="flex items-center justify-between gap-4 px-6">
          <div className="label-small uppercase text-[#171717]">Filter</div>
          <DialogClose asChild>
            <button
              type="button"
              className="shrink-0 transition-opacity hover:opacity-80"
              aria-label="Close filter"
            >
              <EventsFilterCloseIcon />
            </button>
          </DialogClose>
        </div>

        <EventsFilterSortFields {...fields} saveSlot={EventsFilterSaveButton} />
      </DialogContent>
    </Dialog>
  );
}

/** Mobile: bottom-sheet drawer launched from the FILTER + sort header. */
function EventsFilterSortDrawer({
  open,
  onOpenChange,
  ...fields
}: EventsFilterSortProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        hideCloseButton
        className="gap-2 overflow-hidden  border-t border-[#DBDBDB] bg-white p-0 pt-2"
      >
        <div className="flex items-center justify-between gap-4 px-6">
          <div className="label-small uppercase text-[#171717]">Filter</div>
          <DialogClose asChild>
            <button
              type="button"
              className="shrink-0 transition-opacity hover:opacity-80"
              aria-label="Close filter"
            >
              <EventsFilterCloseIcon />
            </button>
          </DialogClose>
        </div>

        <div className="flex-1 overflow-y-auto">
          <EventsFilterSortFields
            {...fields}
            saveSlot={EventsFilterSaveButton}
          />
        </div>
      </DialogDrawerContent>
    </Dialog>
  );
}

function MapGridArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M9.38802 2.66669L7.88255 4.19072L10.6666 6.76352H1.33325V9.23652H10.6541L7.88255 11.8093L9.38802 13.3334L14.6666 7.98972L9.38802 2.66669Z"
        fill="#171717"
      />
    </svg>
  );
}

function EventsMapLink({
  href,
  className,
  arrow = 'horizontal',
}: {
  href: string;
  className?: string;
  arrow?: 'horizontal' | 'diagonal' | 'grid';
}) {
  const arrowSrc =
    arrow === 'diagonal' ? MAP_ARROW_DIAGONAL_PATH : MAP_ARROW_PATH;

  return (
    <Link href={href} className={className ?? EVENT_MAP_LINK_CLASS}>
      <span className="label-large uppercase leading-none text-[var(--Text-Primary-Text,#171717)]">
        MAP
      </span>
      {arrow === 'grid' ? (
        <MapGridArrowIcon />
      ) : (
        <Image
          src={arrowSrc}
          alt=""
          width={16}
          height={16}
          className={cn(
            'shrink-0',
            arrow === 'diagonal' ? 'size-[15px]' : 'size-4'
          )}
          aria-hidden
        />
      )}
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
    poster: getDiceEventPosterUrl(event.images),
    location: getLocation(primaryVenue),
    ticketsUrl: getTicketsUrl(event.name),
    mapsUrl: EVENTS_MAP_HREF,
    isManual: false,
    hostedByIrl: false,
    citySlug: matchCity(primaryVenue?.city),
  };
};

export default function EventsPage() {
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filtersHydrated, setFiltersHydrated] = useState(false);

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

  const clearFilters = () => {
    setSelectedCity('all');
    setDateFrom('');
    setDateTo('');
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

    return [...withoutNext].sort((a, b) => compareEvents(a, b, sortOrder));
  }, [nextEvent, visibleEvents, sortOrder]);

  const pastEvents = useMemo(() => {
    const onlyPast = visibleEvents.filter(
      (event) =>
        event.start &&
        !isTodayOrFuture(eventStatusDate(event)) &&
        // IRL allowlist: past events only render when hosted by IRL.
        event.hostedByIrl
    );
    return [...onlyPast].sort((a, b) => compareEvents(a, b, sortOrder));
  }, [visibleEvents, sortOrder]);

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

  const appliedFilters: AppliedFilter[] = [
    ...(selectedCity !== 'all'
      ? [
          {
            key: 'city',
            label:
              cities?.find((city) => city.slug === selectedCity)?.name ??
              selectedCity,
            onClear: () => setSelectedCity('all'),
          },
        ]
      : []),
    ...(dateFrom || dateTo
      ? [
          {
            key: 'date',
            label: dateRangeLabel,
            onClear: () => {
              setDateFrom('');
              setDateTo('');
            },
          },
        ]
      : []),
  ];

  const hasNoEvents =
    !isLoading &&
    !manualLoading &&
    !error &&
    !manualError &&
    !nextEvent &&
    remainingUpcomingEvents.length === 0 &&
    pastEvents.length === 0;

  return (
    <div className="min-h-screen bg-white font-grotesk">
      <header className="hidden bg-white pt-4 xl:block">
        <MapDesktopNav searchSlot={<MapDesktopSearchSlot />} />
      </header>

      <section
        className="hidden w-full items-start justify-center gap-4 bg-[var(--Backgrounds-Highlight,#FFF200)] p-[var(--sds-size-space-400)] xl:flex"
        aria-label="Events page introduction"
      >
        <div className="flex max-w-[1440px] flex-1 basis-0 items-center gap-[var(--sds-size-space-800)]">
          <h2 className="h-8 w-[108px] shrink-0 text-[#171717]">Events</h2>
          <p className="title4 flex h-8 min-w-0 flex-1 basis-0 flex-col justify-end text-[#171717]">
            Local knowledge, on the calendar. The nights our city editors
            don&apos;t want you to miss.
          </p>
        </div>
      </section>

      {nextEvent && (
        <section
          className="relative hidden h-[452px] w-full items-center justify-center overflow-hidden bg-[#d9a7c7] bg-gradient-to-r from-[#fffcdc] to-[#d9a7c7]  xl:flex"
          aria-label="Next event"
        >
          <div className="relative flex max-w-[1440px] flex-1 basis-0 items-center justify-center gap-16">
            <div className="relative h-[420px] w-[337px] shrink-0 aspect-[65/81] overflow-hidden bg-neutral-200">
              {nextEvent.poster ? (
                <Image
                  src={nextEvent.poster}
                  alt={nextEvent.title}
                  fill
                  className="object-cover object-center transition-opacity hover:opacity-95"
                  sizes="337px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-neutral-300 bg-neutral-100">
                  <Calendar className="h-8 w-8 text-neutral-500" />
                </div>
              )}
            </div>

            <div className="flex w-[583px] shrink-0 flex-col items-start gap-4 bg-[var(--Text-Primary-CTA,#FFF)] p-[24px_var(--sds-size-space-600)]">
              <div className="text-[#757575] label-small">NEXT EVENT</div>

              <h2 className="text-[#313131]">{nextEvent.title}</h2>

              <div className="flex min-w-0 items-center gap-2">
                <div className={EVENT_META_PILL_CLASS}>
                  <Calendar className="size-3 shrink-0 text-[#757575]" />
                  <span className="whitespace-nowrap text-[11px] uppercase leading-none tracking-wide text-[#757575]">
                    {formatEventDateChip(nextEvent.start, nextEvent.end)}
                  </span>
                </div>
                <div
                  className={cn(EVENT_META_PILL_CLASS, 'min-w-0 max-w-[16rem]')}
                >
                  <MapPin className="size-3 shrink-0 text-[#757575]" />
                  <span className="truncate text-[11px] uppercase leading-none tracking-wide text-[#757575]">
                    {nextEvent.location}
                  </span>
                </div>
              </div>

              <div className="flex w-full items-center justify-between">
                <a
                  href={nextEvent.ticketsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EVENT_HERO_REGISTER_CTA_CLASS}
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
                <EventsMapLink
                  href={nextEvent.mapsUrl || EVENTS_MAP_HREF}
                  className={EVENT_HERO_MAP_LINK_CLASS}
                  arrow="diagonal"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto hidden w-full max-w-md px-4 pt-3 md:px-2 xl:block xl:max-w-[1444px] xl:px-0">
        <div className="relative hidden w-full xl:block">
          <div className={EVENT_DESKTOP_FILTER_HEADER_CLASS}>
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={sortModalOpen}
                  aria-label="Filter events"
                  onClick={() => setSortModalOpen(true)}
                  className="label-small uppercase text-[var(--Text-Primary-Text,#171717)]"
                >
                  FILTER
                </button>
                <EventsAppliedFilters filters={appliedFilters} />
              </div>
              <button
                type="button"
                aria-label="Filter and sort events"
                aria-haspopup="dialog"
                aria-expanded={sortModalOpen}
                onClick={() => setSortModalOpen(true)}
                className="shrink-0"
              >
                <EventsSortIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden xl:flex xl:w-full xl:flex-col xl:items-center">
        {(isLoading || manualLoading) && (
          <div className="flex min-h-48 w-[1444px] max-w-full flex-col items-center justify-center px-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-700" />
            <p className="mt-3 body-small text-neutral-700">
              Loading events...
            </p>
          </div>
        )}

        {(error || manualError) && (
          <div className="w-[1444px] max-w-full rounded-[26px] border border-rose-200 bg-rose-50 px-4 py-5">
            <p className="body-small text-rose-700">
              {error instanceof Error
                ? error.message
                : manualError instanceof Error
                  ? manualError.message
                  : 'Unable to load events right now.'}
            </p>
          </div>
        )}

        {remainingUpcomingEvents.length > 0 && (
          <section className="flex w-full justify-center">
            <div className={EVENT_DESKTOP_GRID_CLASS}>
              {remainingUpcomingEvents.map((event) => (
                <EventDesktopCard
                  key={event.id}
                  event={event}
                  onPosterClick={setSelectedPoster}
                />
              ))}
            </div>
          </section>
        )}

        {pastEvents.length > 0 && (
          <section className="flex w-full flex-col items-center gap-4 pt-8">
            <h2 className={cn(SECTION_TITLE_CLASS, 'w-[1444px] max-w-full')}>
              PAST EVENTS
            </h2>
            <div className={EVENT_DESKTOP_GRID_CLASS}>
              {pastEvents.map((event) => (
                <EventDesktopCard
                  key={event.id}
                  event={event}
                  onPosterClick={setSelectedPoster}
                  dimmed
                />
              ))}
            </div>
          </section>
        )}

       
      </div>

      <div className="px-4 pt-4 md:px-2 xl:hidden">
        <div className="mx-auto max-w-md">
          <MapNav className={MAP_NAV_MOBILE_FLUSH_X} />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 pt-3 md:px-2">
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
          <section className="space-y-2 xl:hidden">
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
                    <div className={EVENT_META_PILL_CLASS}>
                      <Calendar className="size-3 shrink-0 text-[#757575]" />
                      <span className="whitespace-nowrap text-[11px] uppercase leading-none tracking-wide text-[#757575]">
                        {formatEventDateChip(nextEvent.start, nextEvent.end)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        EVENT_META_PILL_CLASS,
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
                    arrow="diagonal"
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

        <div className="xl:hidden">
          <div className={cn(EVENT_DESKTOP_FILTER_HEADER_CLASS, 'border-b-0')}>
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={filterDrawerOpen}
                  aria-label="Filter events"
                  onClick={() => setFilterDrawerOpen(true)}
                  className="label-small uppercase text-[var(--Text-Primary-Text,#171717)]"
                >
                  FILTER
                </button>
                <EventsAppliedFilters filters={appliedFilters} />
              </div>
              <button
                type="button"
                aria-label="Filter and sort events"
                aria-haspopup="dialog"
                aria-expanded={filterDrawerOpen}
                onClick={() => setFilterDrawerOpen(true)}
                className="shrink-0"
              >
                <EventsSortIcon />
              </button>
            </div>
          </div>
        </div>

        {remainingUpcomingEvents.length > 0 && (
          <section className="space-y-2 xl:hidden">
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
                      <div className={EVENT_META_PILL_CLASS}>
                        <Calendar className="size-3 shrink-0 text-neutral-500" />
                        <span className="whitespace-nowrap text-[11px] uppercase leading-none text-[#565656]">
                          {formatEventDateChip(event.start, event.end)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          EVENT_META_PILL_CLASS,
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
          <section className="space-y-2 pt-2 xl:hidden">
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
                      <div className={EVENT_META_PILL_CLASS}>
                        <Calendar className="size-3 shrink-0 text-neutral-500" />
                        <span className="whitespace-nowrap text-[11px] uppercase leading-none text-[#565656]">
                          {formatEventDateChip(event.start, event.end)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          EVENT_META_PILL_CLASS,
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
          <div className="flex flex-col items-center justify-center rounded-[26px] bg-white px-5 py-10 text-center  xl:hidden">
          
            {hasActiveFilters ? (
              <>
                <h3 className="title2 text-[#313131] uppercase">No matching events</h3>
               
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
                <h3 className="title2 text-[#313131] uppercase">No Events Available</h3>
               
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

      <EventsFilterSortModal
        open={sortModalOpen}
        onOpenChange={setSortModalOpen}
        cities={cities}
        selectedCity={selectedCity}
        onSelectedCityChange={setSelectedCity}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateRangeLabel={dateRangeLabel}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <EventsFilterSortDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        cities={cities}
        selectedCity={selectedCity}
        onSelectedCityChange={setSelectedCity}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateRangeLabel={dateRangeLabel}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
