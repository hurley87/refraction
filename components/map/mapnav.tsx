'use client';

import Link from 'next/link';
import Image from 'next/image';
import ProfileMenu from '@/components/profile-menu';
import UserMenu from '@/components/layout/user-menu';
import NavigationMenu from '@/components/layout/navigation-menu';
import { useState, type ReactNode } from 'react';

interface MapNavProps {
  /** Renders between the logo and the menu (e.g. mobile search). */
  center?: ReactNode;
}

/**
 * MapNav component for the interactive map page
 * Features a logo on the left and navigation buttons on the right
 */
export default function MapNav({ center }: MapNavProps) {
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
      <div className="relative mx-auto box-border flex h-14 w-[393px] max-w-full min-w-0 shrink-0 items-center justify-between px-4 py-0">
        {/* IRL Logo */}
        <div className="relative flex size-[70px] shrink-0 items-center justify-center rounded-[100px] bg-transparent">
          <Link
            href="/"
            className="flex size-full shrink-0 items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="70"
              height="39"
              viewBox="0 0 70 39"
              fill="none"
            >
              <path
                d="M69.0163 14.6472C65.2385 6.21155 53.2136 2.06444 44.7087 0.74913C34.1287 -0.888932 22.0047 0.0549984 12.2243 4.6177C7.79236 6.68462 3.54101 9.65568 1.26113 14.0725C-0.496679 17.4768 -0.406365 21.3078 1.46599 24.6502C3.75688 28.7421 8.03687 31.7242 12.231 33.685C25.745 40.0074 45.9356 39.8968 59.2051 32.9798C63.1503 30.924 67.3135 27.6677 69.0978 23.4963C70.3291 20.6159 70.2983 17.51 69.0163 14.6472ZM22.5179 10.8671C21.6897 11.7027 20.6808 12.0498 19.4891 12.3924C19.3173 12.441 19.3063 12.6842 19.4737 12.7461C20.1742 13.0092 20.8328 13.2148 21.3923 13.6812C21.921 14.1233 22.3946 14.8661 22.2844 15.5867L20.987 24.0269C20.4847 27.3008 13.0306 29.6728 9.885 26.4276C9.11623 25.634 8.96424 24.6171 9.25941 23.598L11.5966 15.5315C11.7111 15.1402 12.1252 14.6229 12.4028 14.3621C13.3411 13.4778 14.4249 13.1131 15.6276 12.7527C15.8259 12.6931 15.8347 12.4167 15.643 12.3438C15.0263 12.1095 14.4866 11.9171 14.0284 11.5745C13.1121 10.8914 12.9579 9.73968 13.6958 8.87312C15.8325 6.36629 21.6434 6.2646 23.0113 8.64101C23.4629 9.42578 23.095 10.2791 22.5157 10.8649L22.5179 10.8671ZM45.1536 16.7164C44.9091 17.4216 44.2461 18.0626 43.5544 18.4009C41.2173 19.5437 38.6642 19.4553 36.1663 18.2107C35.9658 18.1113 35.7323 18.2572 35.7323 18.4804L35.7103 24.0799C35.6993 26.8918 29.862 29.56 25.5798 26.8631C24.5731 26.2286 23.7713 25.1056 23.9167 23.9406L24.9806 15.3723C25.0996 14.4085 26.234 13.6724 27.0424 13.2899C29.3729 12.1846 32.567 12.2421 34.7235 13.9045C34.9195 14.057 35.1927 14.0548 35.3909 13.9045C37.7809 12.0697 41.66 12.1714 43.9509 13.7984C44.9091 14.4792 45.5567 15.547 45.1536 16.7142V16.7164ZM59.0311 27.2234C54.7908 29.2925 49.4314 26.6287 48.9842 24.0976L46.1471 9.30419C45.8629 7.69708 50.0416 5.87996 53.9779 7.62413C54.7269 7.95572 55.7027 8.54816 55.9692 9.39925L60.7933 24.0821C61.1832 25.3245 60.203 26.6531 59.0311 27.2256V27.2234Z"
                fill="#171717"
              />
            </svg>
          </Link>
        </div>

        {center}

        {/* Navigation Menu Button */}
        <button
          type="button"
          onClick={handleNavigationMenuClick}
          className="relative flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#ffffff] transition-colors hover:bg-[#5a5a5a]"
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
