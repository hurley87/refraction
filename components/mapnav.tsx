"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/profile-menu";
import { useState } from "react";

interface MapNavProps {
  onProfileMenuToggle?: () => void;
}

/**
 * MapNav component for the interactive map page
 * Features a logo on the left and navigation buttons on the right
 */
export default function MapNav({ onProfileMenuToggle }: MapNavProps) {
  const { user, login } = usePrivy();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileMenuOpen(true);
    onProfileMenuToggle?.();
  };

  return (
    <>
      <div className="box-border content-stretch flex items-center justify-between p-[8px] relative size-full">
        {/* IRL Logo - Centered */}
        <div className="bg-[#313131] relative rounded-[100px] shrink-0 size-[40px] flex items-center justify-center">
          <Link href="/">
            <Image
              src="/home/IRL.png"
              alt="IRL"
              width={27}
              height={14}
              className="block"
            />
          </Link>
        </div>

        {/* Right Side Actions */}
        <div className="content-stretch flex gap-[4px] items-center justify-end relative shrink-0">
          {/* Check-In Map Button */}
          <div className="content-stretch flex gap-[8px] h-[40px] items-center justify-end relative shrink-0">
            <div className="bg-[#4f4f4f] box-border content-stretch flex gap-[8px] h-full items-center overflow-clip px-[16px] py-[10px] relative rounded-[24px] shrink-0">
              <p className="font-inktrap font-medium leading-[16px] relative shrink-0 text-[16px] text-nowrap text-white whitespace-pre">
                Check-In Map
              </p>
              <div className="flex items-center justify-center relative shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20.6396 16.5186H3.36035V15.5186H20.6396V16.5186ZM20.6396 12.5H3.36035V11.5H20.6396V12.5ZM20.6396 8.48242H3.36035V7.48242H20.6396V8.48242Z"
                    fill="white"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Profile Avatar Button */}
          {user ? (
            <div className="bg-[#4f4f4f] box-border content-stretch flex flex-col gap-[8px] items-center justify-center px-[24px] py-[8px] relative rounded-[100px] shrink-0 size-[40px] cursor-pointer hover:opacity-90 transition-opacity">
              <button
                onClick={handleProfileClick}
                className="relative shrink-0 size-[24px] rounded-full bg-gradient-to-r from-[#2400FF] via-[#FA00FF] to-[#FF0000]"
                aria-label="Open user menu"
              >
                {/* Gradient Avatar Circle */}
              </button>
            </div>
          ) : (
            <Button
              className="bg-white text-black text-lg hover:bg-white/80 justify-center font-inktrap rounded-full items-center"
              size="sm"
              onClick={login}
              style={{ width: "123px", height: "40px" }}
            >
              Check In
            </Button>
          )}
        </div>
      </div>

      {/* Profile Menu */}
      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />
    </>
  );
}
