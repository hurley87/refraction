"use client";

import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  path: string;
  isActive?: boolean;
}

/**
 * NavigationMenu component - displays navigation menu matching Figma design
 * Shows menu items with active state for Dashboard and navigation arrows for others
 */
export default function NavigationMenu({
  isOpen,
  onClose,
}: NavigationMenuProps) {
  const { logout } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  // Define menu items with their routes
  const menuItems: MenuItem[] = [
    // { label: "Dashboard", path: "/game" },
    { label: "Map", path: "/interactive-map" },
    { label: "Challenges", path: "/challenges" },
    { label: "Leaderboard", path: "/leaderboard" },
    { label: "Events", path: "/events" },
    { label: "Rewards", path: "/rewards" },
  ];

  // Determine active item based on current pathname
  const activePath =
    pathname === "/" || pathname === "/game" ? "/game" : pathname;

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#ededed] bg-opacity-95 backdrop-blur-sm"
      onClick={(e) => {
        // Close menu when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="fixed top-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg pt-[8px]"
        style={{
          height: `${8 + 44 + menuItems.length * 60 + 60}px`,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute bg-white border border-[#ededed] h-[40px] rounded-[24px] w-full flex items-center justify-center hover:bg-gray-50 transition-colors top-[8px] left-0"
          aria-label="Close menu"
        >
          <div className="relative shrink-0 size-[24px] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="#313131"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>

        {/* Menu Items */}
        {menuItems.map((item, index) => {
          const isActive = activePath === item.path;
          const topPosition = 8 + 44 + index * 60; // 8px top padding + 44px for close button + 4px gap, then 60px spacing per item

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`absolute bg-white box-border flex h-[56px] items-center justify-between pl-[16px] pr-[24px] py-[19px] rounded-[24px] w-full hover:bg-gray-50 transition-colors left-0 ${
                isActive ? "border-[3px] border-[#db85a8]" : "border-none"
              }`}
              style={{ top: `${topPosition}px` }}
            >
              <p className="basis-0 font-inktrap font-medium grow leading-[28px] min-h-px min-w-px not-italic relative shrink-0 text-[#313131] text-[25px] tracking-[-0.5px]">
                {item.label}
              </p>
              {!isActive && (
                <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={24}
                    height={24}
                    className="block max-w-none size-full"
                  />
                </div>
              )}
            </button>
          );
        })}

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="absolute bg-[#b5b5b5] box-border flex h-[56px] items-center justify-between pl-[16px] pr-[24px] py-[8px] rounded-[26px] w-full hover:bg-[#a0a0a0] transition-colors left-0"
          style={{ top: `${8 + 44 + menuItems.length * 60}px` }}
        >
          <p className="font-inktrap font-medium leading-[28px] relative shrink-0 text-[#313131] text-[25px] text-nowrap tracking-[-0.5px] whitespace-pre">
            Log Out
          </p>
          <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M16 17L21 12M21 12L16 7M21 12H3"
                stroke="#4f4f4f"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
