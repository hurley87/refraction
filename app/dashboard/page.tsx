'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import MapNav from '@/components/map/mapnav';
import { useRouter } from 'next/navigation';
import {
  useCurrentPlayer,
  useUserStats,
  usePlayerActivities,
} from '@/hooks/usePlayer';
import { useUserProfile } from '@/hooks/useUserProfile';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import DashboardSocialLinks from '@/components/dashboard/dashboard-social-links';
import Transactions from '@/components/transactions';

export default function DashboardPage() {
  const { user, ready } = usePrivy();
  const router = useRouter();
  const currentUserAddress = user?.wallet?.address;

  const { data: player, isLoading: isLoadingPlayer } = useCurrentPlayer();
  const { data: userProfile } = useUserProfile(currentUserAddress);

  // Use reusable hook for user stats (rank and points)
  const { userStats, isLoading: isLoadingUserStats } =
    useUserStats(currentUserAddress);

  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = usePlayerActivities(currentUserAddress);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.push('/');
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

  // Not logged in state
  if (ready && !user) {
    return null;
  }

  const usernameForDisplay = player?.username?.trim();
  const handleText = usernameForDisplay
    ? `@${usernameForDisplay.replace(/^@/, '')}`
    : null;

  return (
    <div
      style={{
        borderTopLeftRadius: '26px',
        borderTopRightRadius: '26px',
        background:
          'linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), linear-gradient(180deg, #DBDBDB 0%, #757575 100%)',
      }}
      className="min-h-screen pt-2 pb-4 font-grotesk"
    >
      <div className="mx-auto w-full max-w-md px-4 md:px-2">
        {/* Navigation - Sticky Header */}
        <div
          className={`sticky top-0 z-50 pb-2 pt-2 -mt-2 transition-colors duration-200 ${
            isScrolled ? 'bg-transparent backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          <MapNav irlLogoVariant="dashboard" className="w-full px-0" />
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
                <span className="min-w-0 truncate title2 font-bold text-[#ffffff]">
                  {handleText ?? '—'}
                </span>
              )}
            </div>
            <DashboardSocialLinks profile={userProfile} />
          </>
        )}
      </div>

      {/* Points + activity: full-bleed on small screens; from md, same gutters as column above */}
      <div className="mx-auto w-full max-w-md px-0 md:px-2">
        <div
          className="flex w-full flex-col items-start gap-6 rounded-b-[26px] rounded-t-none border-0 p-4"
          style={{
            background: 'var(--Backgrounds-Background, #FFF)',
          }}
        >
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/ep-coin-white.svg"
                alt="Points"
                width={12}
                height={12}
                className="h-4 w-4 brightness-0"
              />
              <div className="label-small uppercase tracking-wide text-[#7D7D7D]">
                Your Points
              </div>
            </div>
            <div className="flex w-full justify-end">
              {isLoadingUserStats ? (
                <div className="h-10 w-20 animate-pulse rounded bg-gray-200" />
              ) : (
                <div className="flex items-end gap-2">
                  <div className="display2 text-[#171717]">
                    {userStats?.total_points?.toLocaleString() || '0'}
                  </div>
                  <Image
                    src="/points-label-white.svg"
                    alt="points"
                    width={39}
                    height={18}
                    className="mb-1 h-[18px] w-auto brightness-0"
                  />
                </div>
              )}
            </div>
          </div>

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
