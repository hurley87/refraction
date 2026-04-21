'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  path: string;
  isActive?: boolean;
  hidden?: boolean;
  external?: boolean;
}

/** Style/Label/Label XL + ink black */
const menuTextClassName =
  'min-w-0 flex-[1_0_0] text-left font-label-xl text-[25px] font-normal not-italic uppercase leading-[28px] tracking-[-0.5px] text-[color:var(--Dark-Tint-100---Ink-Black,#171717)]';

/** Same label style, white on ink (Log Out row) */
const menuTextOnInkClassName =
  'min-w-0 flex-[1_0_0] text-left font-label-xl text-[25px] font-normal not-italic uppercase leading-[28px] tracking-[-0.5px] text-white';

/**
 * Full-screen overlay menu: 393×476 panel, header row (logo + close), scrollable links, fixed auth row.
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
  const allMenuItems: MenuItem[] = [
    { label: 'Map', path: '/interactive-map' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'City Guides', path: '/city-guides', hidden: true },
    { label: 'Leaderboard', path: '/leaderboard', hidden: true },
    { label: 'Events', path: '/events' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'Stellar', path: '/stellar' },
    { label: 'FAQ', path: '/faq', hidden: true },
    { label: 'Livepaper', path: '/livepaper' },
    {
      label: 'Become a Partner',
      path: 'https://www.irl.energy/contact-us',
      external: true,
    }, // pragma: allowlist secret
  ];

  // Filter menu items - Dashboard only shows if user is logged in; hidden items are not shown
  const menuItems = allMenuItems.filter(
    (item) => !item.hidden && (item.path !== '/dashboard' || user)
  );

  // Determine active item based on current pathname
  const activePath =
    pathname === '/' || pathname === '/game' || pathname === '/dashboard'
      ? '/dashboard'
      : pathname;

  const handleNavigate = (item: MenuItem) => {
    if (pendingPath) return;

    if (item.external) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }

    if (pathname === item.path) {
      onClose();
      return;
    }

    setPendingPath(item.path);
    router.push(item.path);
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

  // Prevent body scroll when menu is open to maintain backdrop blur
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scrolling
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#4F4F4F] bg-opacity-70 backdrop-blur-sm"
      style={{
        willChange: 'backdrop-filter',
        WebkitBackdropFilter: 'blur(4px)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        // Close menu when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Menu panel: header in flow so links never sit under logo/close */}
      <div className="absolute top-[53px] left-1/2 flex h-[476px] w-[393px] max-w-[min(393px,calc(100%-32px))] -translate-x-1/2 flex-col overflow-hidden">
        <div className="flex h-[70px] w-full shrink-0 items-center justify-between bg-[var(--Dark-Tint-White,#FFF)] px-4">
          <Image
            src="/irl-svg/irl-logo-new.svg"
            alt="IRL"
            width={70}
            height={70}
            className="size-[70px] shrink-0 object-contain"
            priority
          />
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center p-0 transition-opacity hover:opacity-80"
            aria-label="Close menu"
          >
            <Image
              src="/menu/menu-x.svg"
              alt=""
              width={24}
              height={24}
              className="block size-6"
            />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activePath === item.path;
            const isPending = pendingPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigate(item)}
                aria-busy={isPending || undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`box-border flex w-[393px] max-w-full shrink-0 items-center justify-between px-6 py-[19px] transition-opacity ${
                  isActive
                    ? 'bg-[var(--IRL-Yellow,#FFF200)]'
                    : 'bg-[var(--Dark-Tint-White,#FFF)] hover:opacity-90'
                } ${pendingPath ? 'opacity-70' : ''}`}
              >
                <span className={menuTextClassName}>{item.label}</span>
                {isPending ? (
                  <div className="relative flex size-[24px] shrink-0 items-center justify-center overflow-clip">
                    <span className="sr-only">Navigating to {item.label}</span>
                    <span className="size-5 animate-spin rounded-full border-[3px] border-[#db85a8]/40 border-t-[#db85a8]" />
                  </div>
                ) : isActive ? null : (
                  <div className="relative flex size-[24px] shrink-0 items-center justify-center overflow-clip">
                    <Image
                      src="/arrow-right.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="block size-full max-w-none"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="box-border flex w-[393px] max-w-full shrink-0 items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-6 py-[19px] transition-opacity hover:opacity-90"
          >
            <span className={menuTextOnInkClassName}>Log Out</span>
            <div className="relative flex size-[24px] shrink-0 items-center justify-center overflow-clip"></div>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="mt-1 box-border flex h-[56px] w-full shrink-0 items-center justify-between rounded-[26px] bg-[#b5b5b5] px-[24px] py-[8px] transition-colors hover:bg-[#a0a0a0]"
          >
            <span className={menuTextClassName}>Log In</span>
            <div className="relative flex size-[24px] shrink-0 items-center justify-center overflow-clip"></div>
          </button>
        )}
      </div>
    </div>
  );
}
