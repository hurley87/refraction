"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight, Trophy } from "lucide-react";
import Image from "next/image";
import Header from "./header";
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

  const [currentPage, setCurrentPage] = useState(1);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 9;
  const currentUserAddress = user?.wallet?.address;

  // Fetch leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      await fetchLeaderboard(50); // Fetch more entries for pagination
    };
    loadLeaderboard();
  }, []);

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
            // Calculate rank from leaderboard or make separate API call
            const userRank =
              leaderboard.findIndex(
                (entry) => entry.wallet_address === currentUserAddress,
              ) + 1;

            setUserStats({
              rank: userRank || 999, // Default rank if not found in top leaderboard
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

    if (currentUserAddress && leaderboard.length > 0) {
      loadUserStats();
    }
  }, [currentUserAddress, leaderboard]);

  // Calculate pagination
  useEffect(() => {
    const pages = Math.ceil(leaderboard.length / itemsPerPage);
    setTotalPages(pages || 1);
  }, [leaderboard]);

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return leaderboard.slice(startIndex, endIndex);
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPaginationButtons = () => {
    const buttons: React.ReactNode[] = [];

    // Always show first page
    if (currentPage > 3) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          1
        </button>,
      );

      if (currentPage > 4) {
        buttons.push(
          <span key="ellipsis1" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>,
        );
      }
    }

    // Show pages around current page
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);

    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-10 h-10 rounded-full font-inktrap font-medium text-sm flex items-center justify-center ${
            i === currentPage
              ? "bg-black text-white"
              : "bg-white text-black border border-gray-200 hover:bg-gray-50"
          }`}
        >
          {i}
        </button>,
      );
    }

    // Show last page if needed
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        buttons.push(
          <span key="ellipsis2" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>,
        );
      }

      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          {totalPages}
        </button>,
      );
    }

    // Next button
    if (currentPage < totalPages) {
      buttons.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          <ArrowRight className="w-4 h-4" />
        </button>,
      );
    }

    return buttons;
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",        
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Main Content */}
        <div className="px-0 pt-4 space-y-4">
          {/* Your Place and Points Card */}
          {currentUserAddress && (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
              <div className="grid grid-cols-2 gap-6">
                {/* Your Place */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-white" />
                    <p className="body-small text-white uppercase tracking-wide">
                      Your Rank
                    </p>
                  </div>
                 
                </div>

                {/* Your Rank Display */}
                <div className="flex items-center justify-end">
                  {isLoadingUserStats ? (
                    <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                  ) : userStats?.rank ? (
                    <div className="flex items-baseline gap-1">
                      <div className="flex items-baseline">
                        <div className="display1 text-white font-inktrap">
                          {userStats.rank}
                        </div>
                        <h3 className="text-white font-inktrap font-normal">
                          {getOrdinalSuffix(userStats.rank)}
                        </h3>
                      </div>
                      <div className="w-[39px] h-[18px]">
                        <Image src="/place.png" alt="Points" width={39} height={18} />
                      </div>
                    </div>
                  ) : (
                    <span className="display1 text-white">?</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table Header */}
          <div className="bg-white rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-4">
              <span className="body-small  text-gray-600 uppercase tracking-wide">
                PLACE
              </span>
              <span className="body-small  text-gray-600 uppercase tracking-wide">
                NAME
              </span>
              <span className="body-small  text-gray-600 uppercase tracking-wide text-right">
                PTS
              </span>
            </div>
          </div>

          {/* Leaderboard Entries */}
          <div className="space-y-1">

            {/* Loading State */}
            {isLeaderboardLoading && (
              <>
                {[...Array(itemsPerPage)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-2xl p-4 grid grid-cols-3 gap-4 items-center animate-pulse"
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
                {getCurrentPageData().length > 0 ? (
                  getCurrentPageData().map((entry: LeaderboardUser) => (
                    <div
                      key={entry.player_id}
                      className={`rounded-2xl p-4 grid grid-cols-3 gap-4 items-center bg-white ${
                        entry.wallet_address === currentUserAddress
                          ? "border-2 border-blue-200"
                          : ""
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center gap-2">
                        <span className="body-small  font-medium text-black">
                          {entry.rank}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/profiles/${entry.wallet_address}`}>
                          <span className="font-inktrap text-black text-xs sm:text-sm truncate">
                            {entry.username ||
                              formatWalletAddress(entry.wallet_address)}
                          </span>
                        </Link>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <span className="font-inktrap font-medium text-black text-xs sm:text-sm">
                          {entry.total_points.toLocaleString()}
                        </span>
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
          </div>

          {/* Pagination */}
          {!isLeaderboardLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              {renderPaginationButtons()}
            </div>
          )}
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
