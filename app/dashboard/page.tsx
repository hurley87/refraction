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
import Transactions from '@/components/transactions';

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
      <div style={shellStyle} className="min-h-screen pt-2 pb-4 font-grotesk">
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
      <div style={shellStyle} className="min-h-screen pt-2 pb-4 font-grotesk">
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
    <div style={shellStyle} className="min-h-screen pt-2 pb-4 font-grotesk">
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

        {/* Points block — gutter uses column padding only (same gradient as hero); inner 361×col white card */}
        <div className="w-full pt-4">
          <div
            className="mx-auto flex w-[361px] max-w-full flex-col items-start gap-0 p-4"
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
                    <div className="display2 text-[#171717]">
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

            {/* Tier card */}
            <div className="flex w-full flex-col items-left justify-start gap-2 self-stretch border-t border-[var(--Borders-Light-Border,#DBDBDB)] pt-4">
              <div className="flex items-start justify-start gap-2">
                <Trophy
                  className="h-4 w-4 shrink-0 text-[#757575]"
                  aria-hidden
                />
                <span className="label-small uppercase tracking-wide text-[#757575]">
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
                        {currentTier.min_points.toLocaleString()} &nbsp;&nbsp;NEEDED
                      </span>
                    </div>
                  </div>
                  <p className="body-small w-full text-center text-[#757575]">
                    {currentTier.description}
                  </p>
                  <Link
                    href="/rewards?tab=tiers"
                    className="label-medium inline-flex items-center gap-1 text-[#171717] transition-opacity hover:opacity-80"
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

        {/* Activity stack — white sheet, rounded bottom only */}
        <div className="mt-6 flex w-full flex-col gap-6 rounded-b-[26px] bg-[var(--Backgrounds-Background,#FFF)] px-4 pb-4 pt-2">
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
  );
}
