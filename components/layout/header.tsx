'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import NavigationMenu from '@/components/layout/navigation-menu';

/**
 * Header component for the IRL website
 * Features a logo on the left and hamburger menu button on the right
 */
export default function Header() {
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);

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
          <Link href="/" className="shrink-0 relative z-10 pt-1 pb-1 ">
            <div className="flex h-[40px] items-center justify-center bg-transparent transition-opacity hover:opacity-90 pt-2">
              <Image
                src="/IRL-SVG/IRL-LOGO-NEW.svg"
                alt="IRL"
                width={70}
                height={38.8}
                className="h-auto w-auto"
                priority
              />
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
