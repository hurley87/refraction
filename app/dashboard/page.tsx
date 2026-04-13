'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import MapNav from '@/components/map/mapnav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCurrentPlayer,
  useUserStats,
  usePlayerActivities,
} from '@/hooks/usePlayer';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import Transactions from '@/components/transactions';

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
};

export default function DashboardPage() {
  const { user, ready } = usePrivy();
  const router = useRouter();
  const currentUserAddress = user?.wallet?.address;

  const { data: player, isLoading: isLoadingPlayer } = useCurrentPlayer();

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
      className="min-h-screen px-4 pt-2 pb-4 font-grotesk md:px-2"
    >
      <div className="max-w-md mx-auto">
        {/* Navigation - Sticky Header */}
        <div
          className={`sticky top-0 z-50 pb-2 pt-2 -mt-2 transition-colors duration-200 ${
            isScrolled ? 'bg-transparent backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          <MapNav irlLogoVariant="dashboard" className="max-md:px-0" />
        </div>

        <div className="flex flex-col gap-2 self-stretch">
          {currentUserAddress && (
            <div className="flex items-center gap-4 self-stretch px-1 py-1">
              <LeaderboardAvatar walletAddress={currentUserAddress} size={64} />
              {isLoadingPlayer ? (
                <div
                  className="h-6 w-32 max-w-[60%] rounded-md bg-white/25 animate-pulse"
                  aria-hidden
                />
              ) : (
                <span className="min-w-0 truncate title2 text-[#ffffff]">
                  {handleText ?? '—'}
                </span>
              )}
            </div>
          )}

          {/* Hero Section - Points Display */}
          <div className="bg-white/20 backdrop-blur-md rounded-[26px] p-2 border border-white/30">
            <div className="flex flex-col gap-4">
              {/* Points Display */}
              <div className="flex flex-col gap-2 pt-2 pl-2 pr-2">
                <div className="flex items-center gap-2">
                  <Image
                    src="/ep-coin-white.svg"
                    alt="Points"
                    width={12}
                    height={12}
                    className="w-4 h-4"
                  />
                  <div className="label-small  text-[#EDEDED] uppercase tracking-wide">
                    Your Points
                  </div>
                </div>
                <div className="flex justify-end">
                  {isLoadingUserStats ? (
                    <div className="w-20 h-10 bg-white/20 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="text-white display2">
                        {userStats?.total_points?.toLocaleString() || '0'}
                      </div>
                      <Image
                        src="/points-label-white.svg"
                        alt="points"
                        width={39}
                        height={18}
                        className="mb-1"
                        style={{ width: 'auto', height: 'auto' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Quest Section - Inside Hero */}
            </div>
          </div>

          {/* Transaction Ledger Section */}
          <Transactions
            activities={activities}
            isLoading={isLoadingActivities}
            error={activitiesError}
            showEmptyStateAction={true}
            emptyStateActionHref="/interactive-map"
            emptyStateActionLabel="Explore Map"
            maxHeight="400px"
          />
        </div>
      </div>
    </div>
  );
}
