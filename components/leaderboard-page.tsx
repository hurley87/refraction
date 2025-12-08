"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Trophy, ChevronDown } from "lucide-react";
import Image from "next/image";
import MapNav from "./mapnav";
import Link from "next/link";
import { useLocationGame } from "@/hooks/useLocationGame";

interface UserStats {
  rank: number;
  total_points: number;
}

interface LeaderboardUser {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
}

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
};

export default function LeaderboardPage() {
  const { user } = usePrivy();
  const { fetchLeaderboard, leaderboard, isLeaderboardLoading } =
    useLocationGame();

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [hasJumpedToUser, setHasJumpedToUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [extendedLeaderboard, setExtendedLeaderboard] = useState<
    LeaderboardUser[]
  >([]);
  const currentUserAddress = user?.wallet?.address;
  const currentUsername = user?.google?.name || user?.twitter?.name;

  const itemsPerPage = 50;

  // Fetch initial leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      await fetchLeaderboard(itemsPerPage); // Fetch first batch
    };
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Sync hook's leaderboard with extended leaderboard
  useEffect(() => {
    if (leaderboard.length > 0 && extendedLeaderboard.length === 0) {
      setExtendedLeaderboard(leaderboard);
    }
  }, [leaderboard, extendedLeaderboard.length]);

  // Load more entries
  const loadMoreEntries = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/leaderboard?limit=${itemsPerPage}&offset=${currentPage * itemsPerPage}`,
      );
      const result = await response.json();

      if (response.ok && result.leaderboard?.length > 0) {
        // Append new entries to extended leaderboard
        setExtendedLeaderboard((prev) => [...prev, ...result.leaderboard]);
        setCurrentPage((prev) => prev + 1);

        // Check if we got fewer items than requested (end of data)
        if (result.leaderboard.length < itemsPerPage) {
          setHasMoreData(false);
        }
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error("Error loading more entries:", error);
      setHasMoreData(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMoreData, isLoadingMore]);

  // Fetch current user's stats
  useEffect(() => {
    const loadUserStats = async () => {
      if (!currentUserAddress) return;

      setIsLoadingUserStats(true);
      try {
        const response = await fetch(
          `/api/player?walletAddress=${encodeURIComponent(currentUserAddress)}`,
        );

        if (response.ok) {
          const result = await response.json();
          const player = result.player;
          console.table(player);

          if (player) {
            // Get user's actual rank from database
            const rankResponse = await fetch(
              `/api/player/rank?walletAddress=${encodeURIComponent(currentUserAddress)}`,
            );

            let actualRank = 999;
            if (rankResponse.ok) {
              const rankResult = await rankResponse.json();
              actualRank = rankResult.rank || 999;
            }

            setUserStats({
              rank: actualRank,
              total_points: player.total_points || 0,
            });
          } else {
            // New user with no data
            setUserStats({
              rank: 999,
              total_points: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setUserStats({
          rank: 999,
          total_points: 0,
        });
      } finally {
        setIsLoadingUserStats(false);
      }
    };

    if (currentUserAddress && extendedLeaderboard.length > 0) {
      loadUserStats();
    }
  }, [currentUserAddress, extendedLeaderboard]);

  // Handle scroll detection for Jump To button and infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200;
      setShowJumpButton(scrolled);

      // Infinite scroll detection
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (
        scrollTop + clientHeight >= scrollHeight - 1000 &&
        hasMoreData &&
        !isLoadingMore
      ) {
        loadMoreEntries();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMoreData, isLoadingMore, loadMoreEntries]);

  // Jump to user's rank (simple version for top 100 only)
  const jumpToUserRank = () => {
    if (userStats?.rank) {
      const userElement = document.querySelector(
        `[data-rank="${userStats.rank}"]`,
      );
      if (userElement) {
        userElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setHasJumpedToUser(true);
      }
    }
  };

  // Back to top
  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setHasJumpedToUser(false);
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",
      }}
      className="min-h-screen px-2 pt-2 pb-0 font-grotesk relative"
    >
      <div className="max-w-md mx-auto">
        {/* Navigation */}
        <div className="mb-2">
          <MapNav />
        </div>

        <div>
          {/* Main Content */}
          <div className="px-0 space-y-4">
            {/* Your Place and Points Card */}
            {currentUserAddress && (
              <div className="bg-white/20 backdrop-blur-md rounded-[26px] p-4 border border-white/30">
                <div className="grid grid-cols-2 gap-6">
                  {/* Your Place */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-white" />
                      <div className="body-small font-grotesk text-white uppercase tracking-wide">
                        Your Rank
                      </div>
                    </div>
                  </div>

                  {/* Your Rank Display */}
                  <div className="flex flex-col items-end">
                    {isLoadingUserStats ? (
                      <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                    ) : userStats?.rank ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <div className="flex items-baseline">
                            <div className="display1 text-white font-inktrap">
                              {userStats.rank}
                            </div>
                            <h3 className="text-white font-inktrap font-normal">
                              {getOrdinalSuffix(userStats.rank)}
                            </h3>
                          </div>
                          <div className="w-auto h-auto">
                            <Image
                              src="/place.svg"
                              alt="Points"
                              width={39}
                              height={18}
                              style={{ width: "auto", height: "auto" }}
                            />
                          </div>
                        </div>
                        <div className="text-white body-small font-inktrap mt-1">
                          {userStats.total_points.toLocaleString()} pts
                        </div>
                      </>
                    ) : (
                      <span className="display1 text-white">?</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table Header */}

            {/* Leaderboard Entries */}
            <div className="space-y-1">
              {/* Leaderboard Header - Sticky */}
              <div className="sticky top-0 z-10 bg-white rounded-[26px] p-4 shadow-sm">
                <div className="grid grid-cols-[auto_1fr_auto] gap-4">
                  <span className="body-small  text-gray-600 uppercase tracking-wide">
                    PLACE
                  </span>
                  <span className="body-small  text-gray-600 uppercase tracking-wide pl-2">
                    NAME
                  </span>
                  <span className="body-small  text-gray-600 uppercase tracking-wide text-right">
                    PTS
                  </span>
                </div>
              </div>

              {/* Loading State */}
              {isLeaderboardLoading && (
                <>
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-[26px] p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center animate-pulse"
                    >
                      <div className="w-6 h-6 bg-gray-200 rounded"></div>
                      <div className="w-20 h-4 bg-gray-200 rounded"></div>
                      <div className="w-12 h-4 bg-gray-200 rounded ml-auto"></div>
                    </div>
                  ))}
                </>
              )}

              {/* Leaderboard Entries */}
              {!isLeaderboardLoading && (
                <>
                  {extendedLeaderboard.length > 0 ? (
                    extendedLeaderboard.map((entry: LeaderboardUser) => (
                      <div
                        key={entry.player_id}
                        data-rank={entry.rank}
                        className={`rounded-[26px] p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center ${
                          entry.wallet_address === currentUserAddress
                            ? "bg-[#4F4F4F]"
                            : "bg-white"
                        }`}
                      >
                        {/* Rank */}
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ededed] body-small font-medium text-black">
                            {entry.rank}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="flex items-center gap-2 min-w-0 pl-5">
                          <Link href={`/profiles/${entry.wallet_address}`}>
                            <span
                              className={`title4 truncate ${
                                entry.wallet_address === currentUserAddress
                                  ? "text-white"
                                  : "text-black"
                              }`}
                            >
                              {entry.username ||
                                formatWalletAddress(entry.wallet_address)}
                            </span>
                          </Link>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <div
                            className={`body-medium ${
                              entry.wallet_address === currentUserAddress
                                ? "text-white"
                                : "text-black"
                            }`}
                          >
                            {entry.total_points.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl p-8 text-center">
                      <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-inktrap">
                        No players yet!
                      </p>
                      <p className="text-sm text-gray-500 font-inktrap">
                        Be the first to check in and earn points
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="bg-white rounded-[26px] p-4 flex justify-center">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                </div>
              )}

              {/* End of Data Indicator */}
              {!hasMoreData && extendedLeaderboard.length > 0 && (
                <div className="bg-white rounded-[26px] p-4 text-center">
                  <p className="text-gray-500 body-small">End of leaderboard</p>
                </div>
              )}
            </div>

            {/* Jump To User Button */}
            {showJumpButton && userStats?.rank && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                <button
                  onClick={
                    extendedLeaderboard.some(
                      (entry) => entry.wallet_address === currentUserAddress,
                    )
                      ? hasJumpedToUser
                        ? backToTop
                        : jumpToUserRank
                      : backToTop
                  }
                  className="bg-[#4f4f4f] hover:bg-[#000000] text-white rounded-full px-4 py-2 shadow-lg transition-colors body-small uppercase tracking-wide flex items-center gap-3"
                >
                  {/* User Avatar */}
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {currentUsername || user?.email ? (
                      <span className="text-gray-600 text-xs font-medium">
                        {(currentUsername || user?.email?.address || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">?</span>
                    )}
                  </div>

                  <span>
                    {extendedLeaderboard.some(
                      (entry) => entry.wallet_address === currentUserAddress,
                    )
                      ? hasJumpedToUser
                        ? "Back To Top"
                        : "Jump To Your Place"
                      : "Back To Top"}
                  </span>

                  {/* Arrow */}
                  <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
                    {extendedLeaderboard.some(
                      (entry) => entry.wallet_address === currentUserAddress,
                    ) && !hasJumpedToUser ? (
                      <ChevronDown className="w-3 h-3 text-white" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-white rotate-180" />
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
