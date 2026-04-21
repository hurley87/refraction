'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import NavigationMenu from '@/components/layout/navigation-menu';

const IRL_LOGO_MARK_PATH =
  'M69.0163 23.496C65.2385 15.0603 53.2136 10.9132 44.7087 9.59787C34.1287 7.9598 22.0047 8.90373 12.2243 13.4664C7.79236 15.5334 3.54101 18.5044 1.26113 22.9212C-0.496679 26.3256 -0.406365 30.1565 1.46599 33.499C3.75688 37.5908 8.03687 40.5729 12.231 42.5337C25.745 48.8561 45.9356 48.7456 59.2051 41.8286C63.1503 39.7727 67.3135 36.5165 69.0978 32.345C70.3291 29.4646 70.2983 26.3587 69.0163 23.496ZM22.5179 19.7158C21.6897 20.5514 20.6808 20.8985 19.4891 21.2411C19.3173 21.2898 19.3063 21.533 19.4737 21.5948C20.1742 21.8579 20.8328 22.0635 21.3923 22.5299C21.921 22.9721 22.3946 23.7148 22.2844 24.4355L20.987 32.8756C20.4847 36.1495 13.0306 38.5215 9.885 35.2763C9.11623 34.4827 8.96424 33.4658 9.25941 32.4467L11.5966 24.3802C11.7111 23.9889 12.1252 23.4717 12.4028 23.2108C13.3411 22.3266 14.4249 21.9618 15.6276 21.6015C15.8259 21.5418 15.8347 21.2655 15.643 21.1925C15.0263 20.9582 14.4866 20.7659 14.0284 20.4232C13.1121 19.7401 12.9579 18.5884 13.6958 17.7219C15.8325 15.215 21.6434 15.1133 23.0113 17.4897C23.4629 18.2745 23.095 19.1278 22.5157 19.7136L22.5179 19.7158ZM45.1536 25.5651C44.9091 26.2703 44.2461 26.9114 43.5544 27.2496C41.2173 28.3925 38.6642 28.304 36.1663 27.0595C35.9658 26.96 35.7323 27.1059 35.7323 27.3292L35.7103 32.9286C35.6993 35.7405 29.862 38.4087 25.5798 35.7118C24.5731 35.0774 23.7713 33.9544 23.9167 32.7894L24.9806 24.2211C25.0996 23.2572 26.234 22.5211 27.0424 22.1387C29.3729 21.0334 32.567 21.0908 34.7235 22.7532C34.9195 22.9057 35.1927 22.9035 35.3909 22.7532C37.7809 20.9184 41.66 21.0201 43.9509 22.6471C44.9091 23.328 45.5567 24.3957 45.1536 25.5629V25.5651ZM59.0311 36.0721C54.7908 38.1413 49.4314 35.4775 48.9842 32.9463L46.1471 18.1529C45.8629 16.5458 50.0416 14.7287 53.9779 16.4729C54.7269 16.8045 55.7027 17.3969 55.9692 18.248L60.7933 32.9309C61.1832 34.1732 60.203 35.5018 59.0311 36.0743V36.0721Z';

/**
 * Header component for the IRL website
 * Features a logo on the left and hamburger menu button on the right
 */
export default function Header() {
  const pathname = usePathname();
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);
  const isHome = pathname === '/';

  return (
    <>
      <div
        className="fixed md:top-[16px] top-[8px] left-[max(8px,env(safe-area-inset-left))] right-[max(8px,env(safe-area-inset-right))] md:left-[171px] md:right-[217px] max-w-7xl mx-auto z-50 rounded-[26px] backdrop-blur-[32px] bg-gradient-to-b from-white/[0.157] to-white/[0.45] border border-white/25"
        data-name="Hero"
      >
        <nav
          className="flex min-w-0 h-12 items-center justify-between gap-2 px-4 py-0 rounded-[inherit]"
          data-name="Nav"
        >
          {/* Inner shadow overlay */}
          <div className="absolute inset-0 pointer-events-none shadow-[0px_4px_8px_0px_inset_rgba(255,255,255,0.15)] rounded-[inherit]" />

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 relative z-10 pt-1 pb-1 "
            aria-label="IRL"
          >
            <div className="flex h-[40px] items-center justify-center bg-transparent transition-opacity hover:opacity-90 pt-2">
              {isHome ? (
                <svg
                  viewBox="0 0 70 63"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-auto w-[70px] shrink-0"
                  aria-hidden
                >
                  <path d={IRL_LOGO_MARK_PATH} fill="#FFF200" />
                </svg>
              ) : (
                <Image
                  src="/irl-svg/irl-logo-new.svg"
                  alt=""
                  width={70}
                  height={38.8}
                  className="h-auto w-auto"
                  priority
                />
              )}
            </div>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsNavigationMenuOpen(true)}
            className="relative z-10 flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#ffffff] transition-colors hover:bg-[#5a5a5a]"
            aria-label="Open navigation menu"
          >
            <Image
              src="/menu/HAMBURGER-MENU.svg"
              alt="Hamburger Menu"
              width={24}
              height={24}
              className="block shrink-0"
            />
          </button>
        </nav>
      </div>

      {/* Navigation Menu */}
      <NavigationMenu
        isOpen={isNavigationMenuOpen}
        onClose={() => setIsNavigationMenuOpen(false)}
      />
    </>
  );
}
