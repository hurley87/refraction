'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import NavigationMenu from '@/components/layout/navigation-menu';
import { SPONSORED_ACTIVATION_EXIT_URL } from '@/lib/sponsored-activation/exit-url';

type SponsoredActivationHeroNavProps = {
  /** Replace the left-side IRL logo with a circular back arrow (e.g. redeemed stage). */
  showBack?: boolean;
};

/**
 * Top navigation overlay for sponsored-activation heroes. Mirrors the homepage
 * header: IRL logo on the left, and SIGN UP (logged out) or the hamburger menu
 * (logged in) on the right. Must be rendered inside a `relative` hero container.
 */
export function SponsoredActivationHeroNav({
  showBack = false,
}: SponsoredActivationHeroNavProps) {
  const { authenticated, login } = usePrivy();
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);

  return (
    <>
      {/* Scrim keeps the white logo / controls legible over any hero image. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 bg-gradient-to-b from-black/40 to-transparent"
      />

      <nav className="absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex h-[56px] items-center justify-between px-4">
        {showBack ? (
          <Link
            href={SPONSORED_ACTIVATION_EXIT_URL}
            aria-label="Back to IRL"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Image
              src="/arrow-left.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden
            />
          </Link>
        ) : (
          <Link
            href={SPONSORED_ACTIVATION_EXIT_URL}
            aria-label="IRL"
            className="flex h-[56px] w-[70px] shrink-0 items-center justify-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/irl-svg/irl-logo-new-white.svg"
              alt="IRL"
              width={70}
              height={56}
              priority
              className="invert"
            />
          </Link>
        )}

        {authenticated ? (
          ''
        ) : (
          <button
            type="button"
            onClick={login}
            className="flex h-11 min-h-[44px] w-[107px] shrink-0 items-center justify-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] label-large uppercase text-black bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)]"
          >
            SIGN UP
          </button>
        )}
      </nav>

      <NavigationMenu
        isOpen={isNavigationMenuOpen}
        onClose={() => setIsNavigationMenuOpen(false)}
      />
    </>
  );
}
