'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { type ReactNode } from 'react';
import LocationSearch, {
  type LocationSearchProps,
} from '@/components/shared/location-search';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import { cn } from '@/lib/utils';

/** Landing header mark (`irl-logo-new-white.svg`), inverted for light map chrome. */
const MAP_DESKTOP_LOGO_SRC = '/irl-svg/irl-logo-new-white.svg';

/** Style/Body/Body Medium — desktop map nav LocationSearch (Gal Gothic). */
export const MAP_DESKTOP_SEARCH_INPUT_CLASS =
  'text-center text-base font-medium leading-[22px] tracking-[-0.48px] font-["Gal_Gothic_Variable",sans-serif] text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)] placeholder:text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)]';

const DESKTOP_NAV_LINKS = [
  { label: 'Map', path: '/interactive-map' },
  { label: 'City Guides', path: '/city-guides' },
  { label: 'Events', path: '/events' },
  { label: 'Rewards', path: '/rewards' },
] as const;

type MapDesktopSearchSlotProps = {
  onSelect?: LocationSearchProps['onSelect'];
  proximity?: LocationSearchProps['proximity'];
};

/** Map-style location search for the desktop nav bar (255px wide). */
export function MapDesktopSearchSlot({
  onSelect,
  proximity = null,
}: MapDesktopSearchSlotProps) {
  const router = useRouter();

  const handleSelect: LocationSearchProps['onSelect'] =
    onSelect ??
    ((picked) => {
      const params = new URLSearchParams({
        lat: String(picked.latitude),
        lng: String(picked.longitude),
      });
      if (picked.id) params.set('placeId', picked.id);
      router.push(`/interactive-map?${params.toString()}`);
    });

  return (
    <div className="flex h-16 w-[255px] items-center gap-4 px-2 py-[var(--sds-size-space-300)]">
      <LocationSearch
        placeholder="Search"
        proximity={proximity}
        onSelect={handleSelect}
        className="h-full min-w-0 flex-1"
        inputClassName={MAP_DESKTOP_SEARCH_INPUT_CLASS}
      />
    </div>
  );
}

interface MapDesktopNavProps {
  leftSlot?: ReactNode;
  /** Search control — sits to the right of the logo / back control. */
  searchSlot?: ReactNode;
  className?: string;
}

/**
 * Desktop map top bar (xl+): logo + search left, nav + avatar right.
 * ≤1366×768: max 1366px; 1920×1080: max 1920px; 2560×1440+: full width.
 */
export function MapDesktopNav({
  leftSlot,
  searchSlot,
  className,
}: MapDesktopNavProps) {
  const { user, login } = usePrivy();
  const walletAddress = user?.wallet?.address;

  return (
    <header
      className={cn(
        'pointer-events-auto mx-auto box-border flex h-16 w-full max-w-[1366px] items-center justify-between gap-4 px-4 mapWide:max-w-[1920px] mapHd:max-w-none',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        {leftSlot ? (
          <div className="flex shrink-0 items-center">{leftSlot}</div>
        ) : (
          <Link
            href="/"
            className="flex h-[70px] w-[70px] shrink-0 items-center justify-center transition-opacity hover:opacity-90"
            aria-label="IRL home"
          >
            <Image
              src={MAP_DESKTOP_LOGO_SRC}
              alt=""
              width={70}
              height={56}
              priority
              className="block shrink-0 invert"
            />
          </Link>
        )}
        {searchSlot ? (
          <div className="flex shrink-0 items-center">{searchSlot}</div>
        ) : null}
      </div>

      <nav className="flex shrink-0 items-center gap-6" aria-label="Primary">
        {DESKTOP_NAV_LINKS.map((item) => {
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'label-large uppercase text-[#171717] transition-opacity hover:opacity-70'
              )}
            >
              {item.label}
            </Link>
          );
        })}

        {user && walletAddress ? (
          <Link
            href="/dashboard"
            className="block shrink-0 overflow-hidden rounded-full border border-[#DBDBDB] transition-opacity hover:opacity-90"
            aria-label="Go to dashboard"
          >
            <LeaderboardAvatar walletAddress={walletAddress} size={44} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={login}
            className="flex h-11 shrink-0 items-center justify-center bg-[#171717] px-4 label-large uppercase text-white transition-colors hover:bg-black"
          >
            Log In
          </button>
        )}
      </nav>
    </header>
  );
}
