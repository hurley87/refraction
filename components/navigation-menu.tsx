"use client";

import { useEffect, useState } from "react";
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
  const { user, login, logout } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Define menu items with their routes
  const menuItems: MenuItem[] = [
    // { label: "Dashboard", path: "/game" },
    { label: "Map", path: "/interactive-map" },
    { label: "Challenges", path: "/challenges" },
    { label: "Leaderboard", path: "/leaderboard" },
    { label: "Events", path: "/events" },
    { label: "Rewards", path: "/rewards" },
    { label: "FAQ", path: "/faq" },
    { label: "Livepaper", path: "/livepaper" },
    { label: "Become a Partner", path: "/partners" },
  ];

  // Determine active item based on current pathname
  const activePath =
    pathname === "/" || pathname === "/game" ? "/game" : pathname;

  const handleNavigate = (path: string) => {
    if (pendingPath) return;

    if (pathname === path) {
      onClose();
      return;
    }

    setPendingPath(path);
    router.push(path);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleLogin = () => {
    login();
    onClose();
  };

  useEffect(() => {
    if (!pendingPath) return;

    if (pathname === pendingPath) {
      setPendingPath(null);
      onClose();
    }
  }, [pathname, pendingPath, onClose, isOpen]);

  useEffect(() => {
    if (!isOpen && pendingPath) {
      setPendingPath(null);
    }
  }, [isOpen, pendingPath]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#4F4F4F] bg-opacity-70 backdrop-blur-sm"
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
          height: `${
            8 +
            44 +
            menuItems.length * 60 +
            60 +
            menuItems.filter((item) => activePath === item.path).length * 6
          }px`,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute bg-white border border-[#ededed] h-[40px] rounded-[24px] flex items-center justify-center hover:bg-gray-50 transition-colors top-[8px] left-2 right-2"
          aria-label="Close menu"
        >
          <div className="relative shrink-0 size-[24px] flex items-center justify-center">
            <Image
              src="/x-close.svg"
              alt="Close"
              width={24}
              height={24}
              className="object-center"
            />
          </div>
        </button>

        {/* Menu Items */}
        {menuItems.map((item, index) => {
          const isActive = activePath === item.path;
          const isPending = pendingPath === item.path;
          // Count how many items before this one are active (each adds 6px: 3px top + 3px bottom padding)
          const activeItemsBefore = menuItems
            .slice(0, index)
            .filter((prevItem) => activePath === prevItem.path).length;
          const topPosition = 8 + 44 + index * 60 + activeItemsBefore * 6; // 8px top padding + 44px for close button + 4px gap, then 60px spacing per item + 6px for each active item before

          return isActive ? (
            <div
              key={item.path}
              className="absolute left-2 right-2 rounded-[26px]"
              style={{
                top: `${topPosition}px`,
                padding: "3px",
                background: "linear-gradient(270deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(270deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
              }}
            >
              <button
                type="button"
                onClick={() => handleNavigate(item.path)}
                aria-busy={isPending || undefined}
                className={`w-full box-border flex h-[56px] items-center justify-between px-[16px] py-[19px] rounded-[23px] bg-white hover:bg-gray-50 transition-colors ${
                  pendingPath ? "opacity-70" : ""
                }`}
              >
                <p className="basis-0 font-pleasure font-medium grow leading-[28px] min-h-px min-w-px not-italic relative shrink-0 text-[#313131] text-[25px] tracking-[-0.5px] text-left">
                  {item.label}
                </p>
                {isPending && (
                  <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
                    <span className="sr-only">Navigating to {item.label}</span>
                    <span className="size-5 animate-spin rounded-full border-[3px] border-[#db85a8]/40 border-t-[#db85a8]" />
                  </div>
                )}
              </button>
            </div>
          ) : (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigate(item.path)}
              aria-busy={isPending || undefined}
              className={`absolute bg-white box-border flex h-[56px] items-center justify-between px-[16px] py-[19px] rounded-[24px] hover:bg-gray-50 transition-colors ${
                pendingPath ? "opacity-70" : ""
              } left-2 right-2`}
              style={{ top: `${topPosition}px` }}
            >
              <p className="basis-0 font-pleasure font-medium grow leading-[28px] min-h-px min-w-px not-italic relative shrink-0 text-[#313131] text-[25px] tracking-[-0.5px] text-left">
                {item.label}
              </p>
              {isPending && (
                <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
                  <span className="sr-only">Navigating to {item.label}</span>
                  <span className="size-5 animate-spin rounded-full border-[3px] border-[#db85a8]/40 border-t-[#db85a8]" />
                </div>
              )}
              {!isActive && !isPending && (
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

        {/* Log Out / Log In Button */}
        {user ? (
          <button
            onClick={handleLogout}
            className="absolute bg-[#b5b5b5] box-border flex h-[56px] items-center justify-between px-[24px] py-[8px] rounded-[26px] hover:bg-[#a0a0a0] transition-colors left-2 right-2"
            style={{
              top: `${
                8 +
                44 +
                menuItems.length * 60 +
                menuItems.filter((item) => activePath === item.path).length * 6
              }px`,
            }}
          >
            <p className="font-pleasure font-medium leading-[28px] relative shrink-0 text-[#313131] text-[25px] text-nowrap tracking-[-0.5px] whitespace-pre text-left">
              Log Out
            </p>
            <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
              <Image
                src="/log-out.svg"
                alt="arrow-right"
                width={24}
                height={24}
                className="block max-w-none size-full"
              />
            </div>
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="absolute bg-[#b5b5b5] box-border flex h-[56px] items-center justify-between px-[24px] py-[8px] rounded-[26px] hover:bg-[#a0a0a0] transition-colors left-2 right-2"
            style={{
              top: `${
                8 +
                44 +
                menuItems.length * 60 +
                menuItems.filter((item) => activePath === item.path).length * 6
              }px`,
            }}
          >
            <p className="font-pleasure font-medium leading-[28px] relative shrink-0 text-[#313131] text-[25px] text-nowrap tracking-[-0.5px] whitespace-pre text-left">
              Log In
            </p>
            <div className="overflow-clip relative shrink-0 size-[24px] flex items-center justify-center">
              <Image
                src="/log-out.svg"
                alt="arrow-right"
                width={24}
                height={24}
                className="block max-w-none size-full"
              />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
