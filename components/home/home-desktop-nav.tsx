'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import LocationSearch from '@/components/shared/location-search';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'MAP', href: '/interactive-map' },
  { label: 'CITY GUIDES', href: '/city-guides' },
  { label: 'EVENTS', href: '/events' },
  { label: 'REWARDS', href: '/rewards' },
  { label: 'ABOUT', href: '/faq' },
] as const;

const HOME_SEARCH_SHELL_CLASS =
  'h-8 max-h-8 min-h-8 border-transparent bg-transparent px-0 shadow-none hover:bg-transparent focus-within:border-transparent focus-within:bg-transparent focus-within:shadow-none';

function HomeSearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className="aspect-square size-6 shrink-0"
      aria-hidden
    >
      <path
        d="M20.5845 18.5238L18.3801 16.3193C19.3498 14.9442 19.9195 13.2671 19.9195 11.4601C19.9195 6.79417 16.1254 3 11.4597 3C6.79403 3 3 6.79417 3 11.4601C3 16.1259 6.79403 19.9201 11.4597 19.9201C13.2667 19.9201 14.9411 19.3478 16.3189 18.3807L18.5232 20.5851C18.8067 20.8686 19.1803 21.0117 19.5539 21.0117C19.9274 21.0117 20.301 20.8686 20.5845 20.5851C21.1541 20.0155 21.1541 19.0934 20.5845 18.5238ZM5.91706 11.4627C5.91706 8.4051 8.40491 5.91717 11.4624 5.91717C14.5199 5.91717 17.0077 8.4051 17.0077 11.4627C17.0077 14.5203 14.5199 17.0082 11.4624 17.0082C8.40491 17.0082 5.91706 14.5203 5.91706 11.4627Z"
        fill="#757575"
      />
    </svg>
  );
}

const HOME_SEARCH_INPUT_CLASS =
  'text-center font-["Gal_Gothic_Variable",sans-serif] text-[length:var(--sds-typography-body-size-medium,16px)] font-medium not-italic leading-[var(--Line-Height-3,24px)] tracking-[var(--Kerning-Body,0)] text-[color:var(--Text-Support-Text,#757575)] placeholder:text-[color:var(--Text-Support-Text,#757575)]';

const navLinkClassName =
  'flex min-h-[44px] h-11 items-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] label-large uppercase text-white transition-opacity hover:opacity-80';

/**
 * Desktop homepage top bar (xl+): logo, search, primary nav + sign up.
 * Logged out, only the logo and SIGN UP show; the full nav appears after login.
 */
export function HomeDesktopNav() {
  const { ready, authenticated, user, login } = usePrivy();
  const router = useRouter();
  const walletAddress = user?.wallet?.address;
  const showFullNav = ready && authenticated;

  const handleSearchSelect = (picked: {
    longitude: number;
    latitude: number;
    id: string;
  }) => {
    const params = new URLSearchParams({
      lat: String(picked.latitude),
      lng: String(picked.longitude),
    });
    if (picked.id) {
      params.set('placeId', picked.id);
    }
    router.push(`/interactive-map?${params.toString()}`);
  };

  return (
    <nav
      className="relative mx-auto flex h-16 w-full max-w-[1921px] items-center justify-between px-4"
      aria-label="Primary"
    >
      <Link
        href="/"
        aria-label="IRL home"
        className="flex h-[70px] w-[70px] shrink-0 items-center justify-center transition-opacity hover:opacity-90"
      >
        <Image
          src="/irl-svg/irl-logo-home-nav.svg"
          alt=""
          width={70}
          height={67}
          priority
          className="block shrink-0"
        />
      </Link>

      {showFullNav ? (
        <div className="absolute left-[115px] flex h-8 w-[255px] shrink-0 items-center">
          <div className="flex flex-[1_0_0] items-center gap-[var(--sds-size-space-200)] self-stretch rounded-[36px] border border-[var(--Text-Support-Text,#757575)] bg-[rgba(23,23,23,0.7)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-100)]">
            <HomeSearchIcon />
            <LocationSearch
              placeholder="Search Map"
              onSelect={handleSearchSelect}
              className="min-w-0 flex-1"
              shellClassName={HOME_SEARCH_SHELL_CLASS}
              hideSearchIcon
              inputClassName={HOME_SEARCH_INPUT_CLASS}
              dropdownTheme="dark"
            />
          </div>
        </div>
      ) : null}

      <div className="flex h-12 items-center justify-center gap-1">
        {showFullNav ? (
          <>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClassName}
              >
                {item.label}
              </Link>
            ))}

            {walletAddress ? (
              <Link
                href="/dashboard"
                className="flex min-h-[44px] h-11 items-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] transition-opacity hover:opacity-90"
                aria-label="Go to dashboard"
              >
                <LeaderboardAvatar walletAddress={walletAddress} size={44} />
              </Link>
            ) : null}
          </>
        ) : ready ? (
          <button
            type="button"
            onClick={login}
            className={cn(
              navLinkClassName,
              'bg-[var(--Backgrounds-Primary-CTA-BG,#FFF)] text-[#171717] hover:opacity-100'
            )}
          >
            SIGN UP
          </button>
        ) : null}
      </div>
    </nav>
  );
}
