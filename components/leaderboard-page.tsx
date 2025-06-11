"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Menu, ArrowRight, Trophy, User } from "lucide-react";
import Header from "./header";
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
          `/api/player?walletAddress=${encodeURIComponent(currentUserAddress)}`
        );

        if (response.ok) {
          const result = await response.json();
          const player = result.player;

          if (player) {
            // Calculate rank from leaderboard or make separate API call
            const userRank =
              leaderboard.findIndex(
                (entry) => entry.wallet_address === currentUserAddress
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
    const maxVisiblePages = 5;

    // Always show first page
    if (currentPage > 3) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          1
        </button>
      );

      if (currentPage > 4) {
        buttons.push(
          <span key="ellipsis1" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>
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
        </button>
      );
    }

    // Show last page if needed
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        buttons.push(
          <span key="ellipsis2" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>
        );
      }

      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          {totalPages}
        </button>
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
        </button>
      );
    }

    return buttons;
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Leaderboard Header */}
        <div className="px-0 pt-8 mb-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-inktrap font-bold text-black">
              Leaderboard
            </h1>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Your Place and Points Card */}
          {currentUserAddress && (
            <div className="bg-white rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Your Place */}
                <div>
                  <p className="text-xs font-inktrap text-gray-600 mb-3 uppercase tracking-wide">
                    YOUR PLACE
                  </p>
                  <div className="flex items-center">
                    <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2 border border-gray-300">
                      {isLoadingUserStats ? (
                        <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                      ) : (
                        <>
                          <span className="font-inktrap font-medium text-black text-lg">
                            {userStats?.rank || "?"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Your Points */}
                <div>
                  <p className="text-xs font-inktrap text-gray-600 mb-3 uppercase tracking-wide">
                    YOUR POINTS
                  </p>
                  <div className="flex items-baseline gap-2">
                    {isLoadingUserStats ? (
                      <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      <>
                        <span className="text-2xl font-inktrap font-bold text-black">
                          {userStats?.total_points || 0}
                        </span>
                        <span className="text-sm font-inktrap text-gray-600">
                          pts
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl p-4">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200 mb-4">
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                PLACE
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                NAME
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide text-right">
                PTS
              </span>
            </div>

            {/* Loading State */}
            {isLeaderboardLoading && (
              <div className="space-y-2">
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
              </div>
            )}

            {/* Leaderboard Entries */}
            {!isLeaderboardLoading && (
              <div className="space-y-2">
                {getCurrentPageData().length > 0 ? (
                  getCurrentPageData().map((entry: LeaderboardUser) => (
                    <div
                      key={entry.player_id}
                      className={`rounded-2xl p-4 grid grid-cols-3 gap-4 items-center ${
                        entry.wallet_address === currentUserAddress
                          ? "bg-blue-50 border-2 border-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center gap-2">
                        {entry.rank <= 3 && (
                          <Trophy
                            className={`w-4 h-4 ${
                              entry.rank === 1
                                ? "text-yellow-500"
                                : entry.rank === 2
                                ? "text-gray-400"
                                : "text-orange-500"
                            }`}
                          />
                        )}
                        <span className="text-lg font-inktrap font-medium text-black">
                          {entry.rank}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-inktrap text-black text-sm truncate">
                          {entry.username ||
                            formatWalletAddress(entry.wallet_address)}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <span className="font-inktrap font-medium text-black">
                          {entry.total_points.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-inktrap">
                      No players yet!
                    </p>
                    <p className="text-sm text-gray-500 font-inktrap">
                      Be the first to check in and earn points
                    </p>
                  </div>
                )}
              </div>
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
