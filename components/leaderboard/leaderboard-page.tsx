"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Trophy, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import MapNav from "@/components/map/mapnav";
import Link from "next/link";
import LeaderboardAvatar from "@/components/leaderboard-avatar";
import { useUserStats } from "@/hooks/usePlayer";

interface LeaderboardUser {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  const currentUserAddress = user?.wallet?.address;
  const currentUsername = user?.google?.name || user?.twitter?.name;

  // Use the reusable hook for user stats
  const { userStats, isLoading: isLoadingUserStats } = useUserStats(
    currentUserAddress
  );

  const [showJumpButton, setShowJumpButton] = useState(false);
  const [hasJumpedToUser, setHasJumpedToUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 50;
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Fetch leaderboard data with pagination
  const fetchLeaderboardPage = useCallback(
    async (page: number, limit: number) => {
      setIsLoadingMore(true);
      try {
        const response = await fetch(
          `/api/leaderboard?page=${page}&limit=${limit}`,
        );
        const result = await response.json();

        // API response is wrapped in { success: true, data: { leaderboard: [...], pagination: {...} } }
        const apiData = result.data || result;
        
        console.log("[LeaderboardPage] API Response:", {
          ok: response.ok,
          status: response.status,
          success: result.success,
          hasData: !!result.data,
          hasLeaderboard: !!apiData.leaderboard,
          leaderboardLength: apiData.leaderboard?.length,
          leaderboardType: typeof apiData.leaderboard,
          isArray: Array.isArray(apiData.leaderboard),
          firstEntry: apiData.leaderboard?.[0],
        });

        if (response.ok && result.success && apiData.leaderboard) {
          console.log("[LeaderboardPage] Setting leaderboard data:", apiData.leaderboard);
          setLeaderboardData(apiData.leaderboard);
          if (apiData.pagination) {
            setPagination(apiData.pagination);
          }
          // Scroll to top when page changes
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          console.warn("[LeaderboardPage] Invalid response:", {
            ok: response.ok,
            success: result.success,
            hasData: !!result.data,
            hasLeaderboard: !!apiData.leaderboard,
            result,
          });
        }
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [],
  );

  // Fetch leaderboard when page changes
  useEffect(() => {
    fetchLeaderboardPage(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };


  // Handle scroll detection for Jump To button
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200;
      setShowJumpButton(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

              {/* Loading State - Show skeleton when loading and have data */}
              {isLoadingMore && leaderboardData.length > 0 && (
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

              {/* Initial Loading State - Empty State with Pulse */}
              {isLoadingMore && leaderboardData.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded mx-auto mb-2"></div>
                  <div className="w-48 h-3 bg-gray-200 rounded mx-auto"></div>
                </div>
              )}

              {/* Leaderboard Entries */}
              {!isLoadingMore && leaderboardData.length > 0 && (
                <>
                  {leaderboardData.map((entry: LeaderboardUser) => (
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
                        <Link 
                          href={`/profiles/${entry.wallet_address}`}
                          className="flex items-center gap-2 min-w-0"
                        >
                            <LeaderboardAvatar
                              walletAddress={entry.wallet_address}
                              size={16}
                            />
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
                  ))}
                </>
              )}

              {/* Empty State - Only show when not loading and no data */}
              {!isLoadingMore && leaderboardData.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center">
                 
                </div>
              )}

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="bg-white rounded-[26px] p-4 flex justify-center">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                </div>
              )}

              {/* Pagination Controls */}
              {!isLoadingMore &&
                leaderboardData.length > 0 &&
                pagination.totalPages > 1 && (
                  <div className="bg-white rounded-[26px] p-5">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="text-base font-medium text-gray-900">
                          {currentPage} / {pagination.totalPages}
                        </span>
                        <span className="text-xs text-gray-500">
                          {pagination.total.toLocaleString()} players
                        </span>
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pagination.totalPages}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                )}

              {/* Bottom spacer for fixed button */}
              <div className="h-20"></div>
            </div>

            {/* Jump To User Button */}
            {showJumpButton && userStats?.rank && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                <button
                  onClick={
                    leaderboardData.some(
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
                    {leaderboardData.some(
                      (entry) => entry.wallet_address === currentUserAddress,
                    )
                      ? hasJumpedToUser
                        ? "Back To Top"
                        : "Jump To Your Place"
                      : "Back To Top"}
                  </span>

                  {/* Arrow */}
                  <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
                    {leaderboardData.some(
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
