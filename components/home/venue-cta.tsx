'use client';

import Link from 'next/link';
import { WelcomeEllipse } from '../shared/welcome-ellipse';

/**
 * Venue network card. Mobile: 3 columns · Desktop (xl+): 6 columns.
 * `mapName` is the spot name on the map when it differs from the label.
 * `placeId` is the spot on the "Part of the IRL Venue Network" map list; it wins
 * over the name, since several map spots can share a name (e.g. Standard Time).
 * `href` is an offsite link for partners that are not spots on the map.
 */
type Venue = {
  name: string;
  city: string;
  mapName?: string;
  placeId?: string;
  href?: string;
};

const VENUES: Venue[] = [
  {
    name: 'Arroz Estudios',
    city: 'Lisbon',
    placeId:
      'dXJuOm1ieGFkci1zdHI6OTlmODVhNGItYzcxZi00ODIwLTkyMjMtNmFhMTFmMGQ2YzI3',
  },
  {
    name: 'Bar San Francisco',
    city: 'Amsterdam',
    placeId: 'dXJuOm1ieHBvaTplNzljOWMzYy1hMTY0LTQ0N2UtYmYxMS1kMjVmM2ZkMTViMDk',
  },
  {
    name: 'Below Breakglass',
    city: 'Montreal',
    placeId: 'vn-below-breakglass-montreal',
  },
  {
    name: 'Dear Eleanor',
    city: 'Miami',
    placeId: 'dXJuOm1ieHBvaTpiMGJmODQyNi1hYWY4LTQyNTgtOGE5My00MjRjZWViYmI2NjQ',
  },
  {
    name: 'Dila @ Dedaena',
    city: 'Tbilisi',
    placeId: 'vn-dila-dedaena-tbilisi',
  },
  { name: 'dubble', city: 'Amsterdam', placeId: 'vn-dubble-amsterdam' },
  {
    name: 'Floyd',
    city: 'Miami',
    mapName: 'Floyd Miami',
    placeId: 'dXJuOm1ieHBvaTpiYjFjYTczMC04ODVmLTRiZmItODNmMy1hYTBlOTkyMGI5ZDM',
  },
  {
    name: 'Hotel Volga',
    city: 'Mexico City',
    placeId: 'dXJuOm1ieGFkcjpmZGFiOGFjZi0wNmNiLTRhMzItOTRhNS1lYTQ0NWY4ZDUyNTI',
  },
  {
    name: 'Ice Cream Sundays',
    city: 'Singapore',
    href: 'https://www.instagram.com/icecreamsundays_/',
  },
  {
    name: 'Iceland Eclipse',
    city: 'Iceland',
    href: 'https://icelandeclipse.com/',
  },
  { name: 'Jolene', city: 'Miami', placeId: 'vn-jolene-miami' },
  {
    name: 'La Cale',
    city: 'Rabat',
    placeId:
      'dXJuOm1ieGFkci1zdHI6YjBkZTYxYWYtNzMwNC00ZTNkLWFkNjktNmZjYTRhNTVhNDhm',
  },
  { name: 'LINEA', city: 'Milan', placeId: 'vn-linea-milano' },
  {
    name: 'LoLo',
    city: 'Austin',
    placeId: 'dXJuOm1ieGFkcjpmMmNjZjZlOC0xNGIyLTRlZjgtYTlmYy1lZDE5Y2Q4Y2U2MmY',
  },
  { name: 'Loop51', city: 'Amsterdam', placeId: 'vn-loop51-amsterdam' },
  {
    name: 'Minos Sound Room',
    city: 'Mexico City',
    placeId: 'dXJuOm1ieHBvaTo1YjFjMTY4NC1lZWRjLTRhYjgtODU2ZC0wOTY4ZjIxMmZlN2M',
  },
  {
    name: 'NILE',
    city: 'Toronto',
    mapName: 'Nile',
    placeId: '999adj-nile-1485-dundas',
  },
  {
    name: 'Panke',
    city: 'Berlin',
    placeId: 'dXJuOm1ieGFkcjo4MTZmMjA5OC0zYzc5LTQyZmQtOTJkMy1iZjNlNDNiZDFjNTc',
  },
  {
    name: 'Platform 9',
    city: 'Vancouver',
    placeId: 'dXJuOm1ieGFkcjpjNjE3NmMxZS1kYTA1LTRlNTgtOWYzMS1jM2NlYmUyMjE2NmM',
  },
  {
    name: 'Plot',
    city: 'Los Angeles',
    placeId: 'dXJuOm1ieGFkcjphZWVmNGY5NC0yNjI1LTQ4MjAtYTU0NS04NmE1ODAyNGM5ZjU',
  },
  {
    name: 'Public Records',
    city: 'NYC',
    placeId: 'dXJuOm1ieHBvaTo0MGYyMTI1NS1kYmE3LTQxNTMtYTFjYS1lYjIxY2YxZmI2Njg',
  },
  {
    name: 'RASA',
    city: 'Singapore',
    mapName: 'RASA Space',
    placeId: 'dXJuOm1ieHBvaTpiZGU2NWVlNi04NzcxLTRiNzItODRiYy0zZWE1OTY5MWJhOTY',
  },
  { name: 'Rhythm', city: 'Toronto', placeId: 'toronto-rhythm' },
  { name: 'RUSH', city: 'Victoria', placeId: 'vn-rush-victoria-bc' },
  {
    name: 'Shadowplay',
    city: 'Bangkok',
    mapName: 'Shadowplay Bangkok',
    placeId: 'dXJuOm1ieHBvaTo1MmJhYzljOC1jZTFiLTRlMDgtOWVhOS01M2FkZmRiYjY1Y2U',
  },
  {
    name: 'Standard Time',
    city: 'Toronto',
    placeId: 'dXJuOm1ieGFkcjpjMDNmMjFmNi0zMGQ2LTRhZTAtYmJhYy1mZWZiYTQ0MzUzMTE',
  },
  {
    name: 'Vespers',
    city: 'London',
    placeId: 'dXJuOm1ieHBvaTpiOTdlYTJmYy1iZDQ1LTQ1NWItOTQ3YS0xNDIxNDJmNGJlNTM',
  },
];

/** Deep link that opens this spot on the interactive map. */
export function venueMapHref(mapName: string, placeId?: string): string {
  const query = new URLSearchParams({
    ...(placeId ? { placeId } : {}),
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
  columns: Venue[][];
  className?: string;
}) {
  return (
    <div className={className}>
      {columns.map((column) => (
        <div
          key={column[0].name}
          className="label-large flex w-[109px] flex-col xl:label-large gap-3 xl:min-w-0 xl:flex-1 xl:w-auto"
        >
          {column.map((venue) => {
            const label = `${venue.name}, ${venue.city}`;
            const content = (
              <>
                <span className="label-small font-medium leading-[10px] xl:label-medium xl:leading-[11px]">
                  ({venue.city})
                </span>
                {venue.name}
              </>
            );
            if (venue.href) {
              return (
                <a
                  key={venue.name}
                  href={venue.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col"
                  aria-label={label}
                >
                  {content}
                </a>
              );
            }
            return (
              <Link
                key={venue.name}
                href={venueMapHref(venue.mapName ?? venue.name, venue.placeId)}
                className="flex flex-col"
                aria-label={label}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function VenueCTA() {
  return (
    <section className="relative flex w-full justify-center bg-[#131313]">
      <div
        className="flex w-full flex-col items-center justify-between px-4 py-16 xl:px-8 xl:py-[120px]"
        style={{
          background:
            'linear-gradient(90deg, #D7D7D7 0.48%, #B3B3B3 37.02%, #919191 79.81%)',
        }}
      >
        <div className="flex w-[361px] max-w-full flex-col items-start xl:w-full xl:max-w-[1100px]">
          <div className="flex items-center gap-2">
            <WelcomeEllipse />
            <h3 className="title4 text-left text-black">
              The IRL Venue Network
            </h3>
          </div>
          <h4 className="w-full pt-16 text-[#171717] xl:max-w-[952px]">
            A network for like-minded independent venues. We promote, support
            and connect clubs, listening bars and in-between spaces across
            cities with programming, sponsors, and funding support.
          </h4>
          <h5 className="w-full pt-4 text-[#171717] xl:max-w-[952px]">
            Run a venue?
            <br />
            <a
              href="https://airtable.com/app6NdM2sO6HCxGv2/pagHBO8wciWJ5g8mp/form?prefill_How%20did%20you%20hear%20about%20the%20IRL%20Venue%20Network%3F=irl.energy%20homepage&hide_How%20did%20you%20hear%20about%20the%20IRL%20Venue%20Network%3F=true"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-opacity hover:opacity-80"
            >
              Apply to join the network →
            </a>
          </h5>
        </div>

        <div className="flex w-[361px] max-w-full flex-col text-[#171717] xl:w-full xl:max-w-[1100px] xl:items-center pt-16">
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
