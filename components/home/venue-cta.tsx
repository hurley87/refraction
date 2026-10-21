'use client';

import Link from 'next/link';
import { WelcomeEllipse } from '../shared/welcome-ellipse';

/**
 * Venue network card. Mobile: 3 columns · Desktop (xl+): 6 columns.
 * `mapName` is the spot name on the map when it differs from the label.
 */
const VENUES: { name: string; city: string; mapName?: string }[] = [
  { name: 'Arroz Estudios', city: 'Lisbon' },
  { name: 'Bar San Francisco', city: 'Amsterdam' },
  { name: 'Below Breakglass', city: 'Montreal' },
  { name: 'Dear Eleanor', city: 'Miami' },
  { name: 'Dila @ Dedaena', city: 'Tbilisi' },
  { name: 'dubble', city: 'Amsterdam' },
  { name: 'Floyd', city: 'Miami', mapName: 'Floyd Miami' },
  { name: 'Hotel Volga', city: 'Mexico City' },
  { name: 'Ice Cream Sundays', city: 'Singapore' },
  { name: 'Iceland Eclipse', city: 'Iceland' },
  { name: 'Jolene', city: 'Miami' },
  { name: 'La Cale', city: 'Rabat' },
  { name: 'LINEA', city: 'Milan' },
  { name: 'LoLo', city: 'Austin' },
  { name: 'Loop51', city: 'Amsterdam' },
  { name: 'Minos Sound Room', city: 'Mexico City' },
  { name: 'NILE', city: 'Toronto' },
  { name: 'Panke', city: 'Berlin' },
  { name: 'Platform 9', city: 'Vancouver' },
  { name: 'Plot', city: 'Los Angeles' },
  { name: 'Public Records', city: 'NYC' },
  { name: 'RASA', city: 'Singapore', mapName: 'RASA Space' },
  { name: 'Rhythm', city: 'Toronto' },
  { name: 'RUSH', city: 'Victoria' },
  { name: 'Shadowplay', city: 'Bangkok', mapName: 'Shadowplay Bangkok' },
  { name: 'Standard Time', city: 'Toronto' },
  { name: 'Vespers', city: 'London' },
];

/** Deep link that opens this spot on the interactive map. */
export function venueMapHref(mapName: string): string {
  const query = new URLSearchParams({
    name: mapName,
    returnTo: '/',
  });
  return `/interactive-map?${query.toString()}`;
}

/** Split items into `count` columns with sizes differing by at most one. */
function splitIntoColumns<T>(items: readonly T[], count: number): T[][] {
  const columnSize = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, index) =>
    items.slice(index * columnSize, (index + 1) * columnSize)
  ).filter((column) => column.length > 0);
}

const MOBILE_VENUES_COLUMNS = splitIntoColumns(VENUES, 3);
const DESKTOP_VENUES_COLUMNS = splitIntoColumns(VENUES, 6);

function VenueNameColumns({
  columns,
  className,
}: {
  columns: (typeof VENUES)[];
  className?: string;
}) {
  return (
    <div className={className}>
      {columns.map((column) => (
        <div
          key={column[0].name}
          className="label-small flex w-[109px] flex-col gap-3 xl:min-w-0 xl:flex-1 xl:w-auto"
        >
          {column.map((venue) => (
            <Link
              key={venue.name}
              href={venueMapHref(venue.mapName ?? venue.name)}
              className="flex flex-col"
              aria-label={`${venue.name}, ${venue.city}`}
            >
              <span className="text-[8px] font-medium leading-[10px] xl:text-[9px] xl:leading-[11px]">
                ({venue.city})
              </span>
              {venue.name}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function VenueCTA() {
  return (
    <section className="relative flex w-full justify-center bg-[#131313]">
      <div
        className="flex h-[964px] w-full flex-col items-center justify-between px-4 py-16 xl:px-8 xl:py-[120px]"
        style={{
          background:
            'linear-gradient(90deg, #D7D7D7 0.48%, #B3B3B3 37.02%, #919191 79.81%)',
        }}
      >
        <div className="flex w-[361px] max-w-full items-center gap-2 xl:w-[952px]">
          <WelcomeEllipse />
          <h2 className="title4 text-left text-black">IRL VENUE NETWORK</h2>
        </div>
        <h3 className="w-[361px] max-w-full text-[#171717] xl:w-[952px] xl:font-['Special_Gothic_SemiExpanded',sans-serif] xl:text-[42px] xl:font-medium xl:leading-[40px]">
          The first wave of the IRL Venue Network. Clubs, listening bars,
          galleries, coffee clubs and artist-run rooms, across four continents.
        </h3>

        <div className="flex w-[361px] max-w-full flex-col text-[#171717] xl:w-full xl:max-w-[1100px] xl:items-center">
          <VenueNameColumns
            columns={MOBILE_VENUES_COLUMNS}
            className="flex w-full justify-between xl:hidden"
          />
          <VenueNameColumns
            columns={DESKTOP_VENUES_COLUMNS}
            className="hidden w-full justify-between gap-4 xl:flex label-large"
          />
        </div>
      </div>
    </section>
  );
}
