'use client';

import Link from 'next/link';
import Image from 'next/image';
import ProfileMenu from '@/components/profile-menu';
import UserMenu from '@/components/layout/user-menu';
import NavigationMenu from '@/components/layout/navigation-menu';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  IrlLogoDashboard,
  IRL_LOGO_PATH_D,
} from '@/components/shared/irl-logo-dashboard';

interface MapNavProps {
  /** Renders between the logo and the menu (e.g. mobile search). */
  center?: ReactNode;
  /** `dashboard`: glow on dark ink mark; `light`: white mark for dark/photo heroes. */
  irlLogoVariant?: 'default' | 'dashboard' | 'light';
  /** Merged onto the nav bar row (e.g. `MAP_NAV_MOBILE_FLUSH_X` when parent supplies horizontal padding). */
  className?: string;
  /** When set, replaces the IRL logo (e.g. city guide article back control). */
  leftSlot?: ReactNode;
}

/** Use when the page already has horizontal padding: keeps the menu clear of the safe area on notched devices. */
export const MAP_NAV_MOBILE_FLUSH_X =
  'max-md:pl-[max(0px,env(safe-area-inset-left))] max-md:pr-[max(0px,env(safe-area-inset-right))]';

/** No base 1rem padding — only safe-area insets (parent supplies layout padding). */
export const MAP_NAV_SAFE_AREA_X =
  'pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]';

/**
 * Top bar: IRL logo (or `leftSlot`) on the left, optional `center`, hamburger + overlays on the right.
 */
export default function MapNav({
  center,
  irlLogoVariant = 'default',
  className,
  leftSlot,
}: MapNavProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);

  const handleNavigationMenuClick = () => {
    setIsProfileMenuOpen(false); // Close profile menu if open
    setIsUserMenuOpen(false); // Close user menu if open
    setIsNavigationMenuOpen(true);
  };

  const handleEditProfile = () => {
    setIsUserMenuOpen(false);
    setIsProfileMenuOpen(true);
  };

  const handleReturnToUserMenu = () => {
    setIsProfileMenuOpen(false);
    setIsUserMenuOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          // w-full + max-w avoids min-content≈393px flex overflow that clips the menu on narrow viewports
          'relative mx-auto box-border flex h-14 w-full max-w-[393px] min-w-0 items-center justify-between gap-2 py-0 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          className
        )}
      >
        {/* IRL Logo or custom left control */}
        {leftSlot ? (
          <div className="relative flex shrink-0 items-center">{leftSlot}</div>
        ) : (
          <div className="relative flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-visible rounded-[100px] bg-transparent">
            <Link
              href="/"
              className="flex size-full shrink-0 items-center justify-center overflow-visible"
            >
              {irlLogoVariant === 'dashboard' ? (
                <IrlLogoDashboard />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="70"
                  height="39"
                  viewBox="0 0 70 39"
                  fill="none"
                  className="block h-[39px] w-[70px] shrink-0"
                  aria-hidden
                >
                  <path
                    d={IRL_LOGO_PATH_D}
                    fill={irlLogoVariant === 'light' ? '#FFFFFF' : '#171717'}
                  />
                </svg>
              )}
            </Link>
          </div>
        )}

        {center ? (
          <div className="flex min-w-0 flex-1 justify-center">{center}</div>
        ) : null}

        {/* Navigation Menu Button */}
        <button
          type="button"
          onClick={handleNavigationMenuClick}
          className="relative z-10 flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#ffffff] transition-colors hover:bg-[#5a5a5a]"
        >
          <Image
            src="/menu/HAMBURGER-MENU.svg"
            alt="Hamburger Menu"
            width={24}
            height={24}
            className="block shrink-0"
          />
        </button>
      </div>

      {/* Navigation Menu */}
      <NavigationMenu
        isOpen={isNavigationMenuOpen}
        onClose={() => setIsNavigationMenuOpen(false)}
      />

      {/* User Menu */}
      <UserMenu
        isOpen={isUserMenuOpen}
        onClose={() => {
          setIsUserMenuOpen(false);
        }}
        onEditProfile={handleEditProfile}
      />

      {/* Profile Menu */}
      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => {
          setIsProfileMenuOpen(false);
        }}
        onReturnToUserMenu={handleReturnToUserMenu}
      />
    </>
  );
}
