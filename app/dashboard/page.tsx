'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import MapNav, { MAP_NAV_SAFE_AREA_X } from '@/components/map/mapnav';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  useCurrentPlayer,
  useUserStats,
  usePlayerActivities,
} from '@/hooks/usePlayer';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTiers } from '@/hooks/useTiers';
import type { Tier } from '@/lib/types';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import DashboardSocialLinks from '@/components/dashboard/dashboard-social-links';
import Transactions from '@/components/dashboard/transactions';

/** Single dashboard shell background (hero + points gutter share this) */
const DASHBOARD_HERO_GRADIENT =
  'linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), linear-gradient(180deg, #DBDBDB 0%, #757575 100%)';

function findTierForPoints(tiers: Tier[], totalPoints: number): Tier | null {
  if (!tiers.length) return null;
  return (
    tiers.find(
      (tier) =>
        totalPoints >= tier.min_points &&
        (tier.max_points === null || totalPoints < tier.max_points)
    ) ?? null
  );
}

export default function DashboardPage() {
  const { user, ready } = usePrivy();
  const router = useRouter();
  const currentUserAddress = user?.wallet?.address;

  const { data: player, isLoading: isLoadingPlayer } = useCurrentPlayer();
  const { data: userProfile } = useUserProfile(currentUserAddress);

  // Use reusable hook for user stats (rank and points)
  const { userStats, isLoading: isLoadingUserStats } =
    useUserStats(currentUserAddress);

  const { data: tiers = [], isLoading: isLoadingTiers } = useTiers();

  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = usePlayerActivities(currentUserAddress);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.replace('/');
    }
  }, [ready, user, router]);

  // Track scroll position for sticky header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shellStyle = {
    borderTopLeftRadius: '26px',
    borderTopRightRadius: '26px',
    background: DASHBOARD_HERO_GRADIENT,
  } as const;

  /** Avoid blank screen while Privy hydrates or during logout redirect */
  if (!ready) {
    return (
      <div
        style={shellStyle}
        className="min-h-screen overflow-x-hidden pt-2 pb-4 font-grotesk"
      >
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md items-center justify-center px-4">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={shellStyle}
        className="min-h-screen overflow-x-hidden pt-2 pb-4 font-grotesk"
      >
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="body-small text-white/90">Redirecting…</p>
        </div>
      </div>
    );
  }

  const usernameForDisplay = player?.username?.trim();
  const handleText = usernameForDisplay
    ? `@${usernameForDisplay.replace(/^@/, '')}`
    : null;

  const totalPoints = userStats?.total_points ?? 0;
  const currentTier =
    !isLoadingUserStats && !isLoadingTiers
      ? findTierForPoints(tiers, totalPoints)
      : null;

  return (
    <div
      style={shellStyle}
      className="min-h-screen overflow-x-hidden pt-2 pb-4 font-grotesk"
    >
      <div className="mx-auto w-full max-w-md px-4 md:px-2">
        {/* Navigation - Sticky Header */}
        <div
          className={`sticky top-0 z-50 min-w-0 pb-2 pt-2 -mt-2 transition-colors duration-200 ${
            isScrolled ? 'bg-transparent backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          <MapNav
            irlLogoVariant="light"
            className={cn('w-full min-w-0', MAP_NAV_SAFE_AREA_X)}
          />
        </div>

        {currentUserAddress && (
          <>
            <div className="mt-[50px] flex items-center gap-4 self-stretch px-1 py-1">
              <LeaderboardAvatar walletAddress={currentUserAddress} size={64} />
              {isLoadingPlayer ? (
                <div
                  className="h-6 w-32 max-w-[60%] rounded-md bg-white/25 animate-pulse"
                  aria-hidden
                />
              ) : (
                <span className="min-w-0 truncate title3 font-normal text-[#ffffff]">
                  {handleText ?? '—'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Points block — full column width so gutter matches activity (shell px-4 + inner p-4 only; no extra inset from a narrower centered card) */}
        <div className="w-full pt-4">
          <div
            className="flex w-full max-w-full flex-col items-start gap-6 p-4"
            style={{
              background: 'var(--Backgrounds-Background, #FFF)',
            }}
          >
            <div className="flex w-full flex-col gap-6">
              {/* Row 1 */}
              <div className="flex w-full items-center gap-2 self-stretch">
                <Image
                  src="/ep-coin-white.svg"
                  alt="Points"
                  width={12}
                  height={12}
                  className="h-4 w-4 shrink-0 brightness-0"
                />
                <div className="label-small uppercase tracking-wide text-[#7D7D7D]">
                  YOUR POINTS
                </div>
              </div>
              {/* Row 2 */}
              <div className="flex h-[35px] w-full items-end justify-end self-stretch">
                {isLoadingUserStats ? (
                  <div className="h-[35px] w-24 max-w-full animate-pulse rounded bg-gray-200" />
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="display2 font-bold text-[#171717]">
                      {userStats?.total_points?.toLocaleString() || '0'}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="18"
                      viewBox="0 0 32 18"
                      fill="none"
                      className="shrink-0"
                      aria-hidden
                    >
                      <path
                        d="M32 18H0V0H32V18ZM22.5732 5.2959C21.9935 5.29593 21.4873 5.39475 21.0566 5.59277C20.6252 5.79157 20.2953 6.06956 20.0664 6.42871C19.8375 6.78718 19.7236 7.20801 19.7236 7.68848C19.7237 8.16857 19.824 8.53138 20.0264 8.84375C20.2281 9.15694 20.5131 9.40625 20.8789 9.59375C21.2448 9.78047 21.6915 9.93144 22.2178 10.0459C22.6906 10.1453 23.0479 10.2388 23.2881 10.3262C23.5282 10.4142 23.7026 10.52 23.8096 10.6465C23.9165 10.7722 23.9697 10.9357 23.9697 11.1338C23.9696 11.401 23.8516 11.6204 23.6152 11.792C23.3788 11.9636 23.0352 12.0488 22.585 12.0488C22.1045 12.0488 21.7274 11.9458 21.457 11.7402C21.1863 11.534 21.0393 11.2366 21.0166 10.8477H19.4941C19.5243 11.5801 19.805 12.1676 20.335 12.6104C20.8651 13.0532 21.6232 13.2744 22.6074 13.2744C23.1797 13.2744 23.7008 13.1809 24.1699 12.9941C24.6391 12.8074 25.0134 12.5227 25.292 12.1416C25.5706 11.7598 25.71 11.2907 25.71 10.7334C25.7099 10.0241 25.4887 9.49139 25.0459 9.13672L25.0469 9.13574C24.6041 8.78104 23.9553 8.5269 23.1006 8.37402C22.6654 8.29044 22.3313 8.20663 22.0986 8.12305C21.8661 8.0395 21.6946 7.93748 21.584 7.81934C21.4733 7.7011 21.418 7.55019 21.418 7.36719C21.418 7.10817 21.522 6.90188 21.7275 6.74902C21.9339 6.59629 22.2275 6.52051 22.6084 6.52051C22.9894 6.52054 23.2968 6.60986 23.5068 6.78906C23.7168 6.96828 23.8363 7.21835 23.8672 7.53906H25.4014C25.3404 6.82966 25.0575 6.27787 24.5537 5.88477C24.05 5.49192 23.3901 5.2959 22.5732 5.2959ZM6.99512 13.1582H8.91895V10.4004H10.0859C10.7268 10.4004 11.2786 10.2964 11.7402 10.0908C12.2016 9.88451 12.5528 9.59504 12.793 9.22168C13.0332 8.84823 13.1533 8.40895 13.1533 7.90527C13.1533 7.40146 13.029 6.93009 12.7812 6.55957C12.5335 6.18998 12.1804 5.90503 11.7227 5.70703H11.7236C11.2658 5.50897 10.7193 5.40918 10.0859 5.40918H6.99512V13.1582ZM13.5547 6.70312H15.3975V13.1582H17.332V6.70312H19.1865V5.40918H13.5547V6.70312ZM9.99414 6.69141C10.4136 6.69141 10.7305 6.79539 10.9443 7.00098C11.1582 7.20732 11.2656 7.50844 11.2656 7.90527C11.2656 8.30194 11.157 8.59022 10.9395 8.79199C10.7218 8.99457 10.4061 9.0957 9.99414 9.0957H8.91797V6.69141H9.99414Z"
                        fill="#171717"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Tier card — 24px gap from points block comes from parent gap-6 */}
            <div className="flex w-full flex-col items-left justify-start gap-2 self-stretch border-t border-[var(--Borders-Light-Border,#DBDBDB)] pt-4">
              <div className="flex items-start justify-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="11"
                  viewBox="0 0 12 11"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M11.9235 2.39412C11.8035 1.99122 11.5423 1.6521 11.1893 1.4385C10.7274 1.1591 10.1889 1.13683 9.70781 1.34132C9.70075 0.878688 9.65637 0.429221 9.57872 0H2.42027C2.34261 0.428209 2.29824 0.877681 2.29118 1.34031C1.8091 1.13582 1.27056 1.15809 0.809664 1.43749C0.456684 1.65108 0.195478 1.99021 0.0754643 2.39311C-0.0536258 2.82334 -0.0163119 3.29913 0.181357 3.77087C0.70982 5.03019 2.92049 6.32898 4.16298 6.97889C4.57446 7.1935 4.88004 7.33826 4.98391 7.38584L5.38732 7.57312C5.2663 9.043 4.36065 10.033 3.62141 10.2102C3.48728 10.2426 3.39046 10.359 3.39046 10.4977V10.7052H5.76551V10.6991H6.23548V10.7052C6.23548 10.7052 8.61659 10.7052 8.61054 10.7052V10.4977C8.61054 10.359 8.51372 10.2426 8.37959 10.2102C7.64035 10.032 6.7347 9.04199 6.61368 7.57211L7.01708 7.38483C7.12096 7.33624 7.42654 7.19249 7.83802 6.97788C9.08152 6.32798 11.2922 5.02918 11.8196 3.76986C12.0173 3.29812 12.0536 2.82233 11.9255 2.3921L11.9235 2.39412ZM1.04566 3.40542C0.796553 2.8112 1.02347 2.41032 1.29274 2.24734C1.40973 2.17648 1.52571 2.14712 1.63867 2.14712C1.90996 2.14712 2.15704 2.32022 2.31437 2.51358L2.35673 2.56622C2.47271 3.51273 2.72887 4.45014 3.09093 5.27011C1.59732 4.3155 1.16769 3.69697 1.04465 3.40542H1.04566ZM10.9513 3.40542C10.8283 3.69697 10.3986 4.31651 8.90503 5.27011C9.26709 4.45014 9.52325 3.51273 9.63923 2.56622L9.68159 2.51358C9.90447 2.24025 10.3049 2.00641 10.7032 2.24734C10.9735 2.41032 11.2004 2.81221 10.9503 3.40542H10.9513Z"
                    fill="#757575"
                  />
                </svg>
                <span className="label-small font-semibold normal-case tracking-normal text-[#757575]">
                  YOUR TIER
                </span>
              </div>
              {isLoadingTiers || isLoadingUserStats ? (
                <div className="h-20 w-full max-w-[280px] animate-pulse rounded bg-gray-100" />
              ) : currentTier ? (
                <>
                  <div className="flex w-full items-center justify-between gap-3">
                    <h3 className="title3 min-w-0 flex-1 text-left text-[#171717]">
                      {currentTier.title}
                    </h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <Image
                        src="/ep_coin.svg"
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4"
                      />
                      <span className="label-small font-semibold normal-case tracking-normal text-[black]">
                        {currentTier.min_points.toLocaleString()}{' '}
                        &nbsp;&nbsp;NEEDED
                      </span>
                    </div>
                  </div>
                  <p className="body-small w-full text-left text-[#757575] leading-tight">
                    {currentTier.description}
                  </p>
                  <Link
                    href="/rewards?tab=tiers"
                    className="label-medium inline-flex w-fit self-start items-center gap-1 border-b-2 border-[#171717] text-[#171717] transition-opacity hover:opacity-80 pt-2"
                  >
                    LEARN MORE
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="shrink-0"
                      aria-hidden
                    >
                      <path
                        d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                        fill="currentColor"
                      />
                    </svg>
                  </Link>
                </>
              ) : (
                <p className="body-small text-center text-[#757575]">
                  Tier information unavailable.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Activity stack — bleed past column px-4 so white meets shell edges (no grey strip beside this block) */}
        <div className="relative -mx-4 mt-6 w-[calc(100%+2rem)] max-w-none rounded-b-[26px] bg-[var(--Backgrounds-Background,#FFF)] md:-mx-2 md:w-[calc(100%+1rem)]">
          <div className="flex flex-col gap-6 px-4 pt-2 pb-4 md:px-2">
            <DashboardSocialLinks profile={userProfile} />
            <Transactions
              activities={activities}
              isLoading={isLoadingActivities}
              error={activitiesError}
              showEmptyStateAction={true}
              emptyStateActionHref="/interactive-map"
              emptyStateActionLabel="Explore Map"
              maxHeight="400px"
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}
