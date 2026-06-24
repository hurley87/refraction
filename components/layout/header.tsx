'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import NavigationMenu from '@/components/layout/navigation-menu';
import { HomeDesktopNav } from '@/components/home/home-desktop-nav';
import { cn } from '@/lib/utils';

interface HeaderProps {
  /** Homepage desktop layout uses the full-width nav redesign. */
  variant?: 'default' | 'home';
}

/**
 * Site header / nav bar.
 *
 * Mobile: 393px-wide bar with logo + sign up (logged out) or hamburger + map (logged in).
 * Desktop home (`variant="home"`): full-width nav with search and primary links.
 */
export default function Header({ variant = 'default' }: HeaderProps) {
  const { authenticated, login } = usePrivy();
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isHomeDesktop = variant === 'home';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-40 transition-colors duration-300',
          isHomeDesktop ? 'h-16' : 'h-[72px]',
          isScrolled && 'bg-black/20 backdrop-blur-md'
        )}
      />

      {isHomeDesktop ? (
        <div className="fixed inset-x-0 top-0 z-50 hidden xl:block">
          <HomeDesktopNav />
        </div>
      ) : null}

      <div
        className={cn(
          'fixed left-1/2 top-2 z-50 w-[393px] max-w-full -translate-x-1/2',
          isHomeDesktop && 'xl:hidden'
        )}
      >
        <nav className="flex h-[56px] w-full items-center justify-between px-4">
          <Link
            href="/"
            aria-label="IRL"
            className="flex h-[70px] w-[70px] shrink-0 items-center justify-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/irl-svg/irl-logo-new-white.svg"
              alt="IRL"
              width={70}
              height={56}
              priority
            />
          </Link>

          {authenticated ? (
            <>
              <button
                type="button"
                onClick={() => setIsNavigationMenuOpen(true)}
                className="flex shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-80"
                aria-label="Open navigation menu"
              >
                <Image
                  src="/irl-svg/hamburger.svg"
                  alt=""
                  width={34}
                  height={18}
                  className="block shrink-0"
                />
              </button>

              <Link
                href="/interactive-map"
                className="shrink-0 label-large uppercase text-white transition-opacity hover:opacity-80"
              >
                MAP
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={login}
              className="flex h-11 min-h-[44px] w-[107px] shrink-0 items-center justify-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] label-large uppercase text-white [backdrop-filter:blur(calc(var(--sds-size-blur-100)/2))]"
            >
              SIGN UP
            </button>
          )}
        </nav>
      </div>

      <NavigationMenu
        isOpen={isNavigationMenuOpen}
        onClose={() => setIsNavigationMenuOpen(false)}
      />
    </>
  );
}
