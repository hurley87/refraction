"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import NavigationMenu from "@/components/navigation-menu";

/**
 * Header component for the IRL website
 * Features a logo on the left and hamburger menu button on the right
 */
export default function Header() {
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false);

  return (
    <>
      <div
        className=" max-w-7xl mx-auto absolute top-[16px] left-[8px] right-[8px] md:top-10 md:left-10 md:right-10 z-50 rounded-[26px] backdrop-blur-[32px] bg-gradient-to-b from-white/[0.157] to-white/[0.45] border border-white/25"
        data-name="Hero"
      >
        <nav
          className="flex items-center justify-between px-2 py-2 overflow-clip rounded-[inherit]"
          data-name="Nav"
        >
          {/* Inner shadow overlay */}
          <div className="absolute inset-0 pointer-events-none shadow-[0px_4px_8px_0px_inset_rgba(255,255,255,0.15)] rounded-[inherit]" />

          {/* Logo */}
          <Link href="/" className="shrink-0 relative z-10">
            <div className="bg-[#313131] rounded-full w-[40px] h-[40px] flex items-center justify-center hover:opacity-90 transition-opacity">
              <Image
                src="/home/IRL.png"
                alt="IRL"
                width={27.312}
                height={14}
                className="block"
              />
            </div>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsNavigationMenuOpen(true)}
            className="shrink-0 relative z-10 bg-white hover:bg-white/80 active:bg-white/60 backdrop-blur-sm rounded-full w-[40px] h-[40px] flex items-center justify-center transition-all cursor-pointer"
            aria-label="Open navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M20.6396 16.5186H3.36035V15.5186H20.6396V16.5186ZM20.6396 12.5H3.36035V11.5H20.6396V12.5ZM20.6396 8.48242H3.36035V7.48242H20.6396V8.48242Z"
                fill="#313131"
              />
            </svg>
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
