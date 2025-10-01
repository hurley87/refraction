"use client";

import { useState } from "react";
import { Trophy, MapPin, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationGame } from "@/hooks/useLocationGame";
import { usePrivy } from "@privy-io/react-auth";

interface UserStats {
  rank: number;
  total_points: number;
  total_checkins: number;
}

interface LeaderboardProps {
  onClose?: () => void;
  autoOpen?: boolean;
}

export default function Leaderboard({
  onClose,
  autoOpen = false,
}: LeaderboardProps = {}) {
  const { user } = usePrivy();
  const [showLeaderboard, setShowLeaderboard] = useState(autoOpen);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const { fetchLeaderboard, leaderboard, isLeaderboardLoading } =
    useLocationGame();

  const currentUserAddress = user?.wallet?.address;

  // Load leaderboard when opened - only if not already loading
  const handleOpen = () => {
    if (!showLeaderboard && !isLeaderboardLoading) {
      setShowLeaderboard(true);
      fetchLeaderboard(50); // Get top 50 players

      // Fetch user stats if logged in
      if (currentUserAddress) {
        fetchUserStats(currentUserAddress);
      }
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setShowLeaderboard(false);
    }
    setUserStats(null); // Clear user stats on close
  };

  // Fetch current user's stats
  const fetchUserStats = async (walletAddress: string) => {
    setIsLoadingUserStats(true);
    try {
      const response = await fetch(
        `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`,
      );

      if (response.ok) {
        const result = await response.json();
        const player = result.player;

        if (player) {
          // Get user's actual rank
          const rankResponse = await fetch(
            `/api/player/rank?walletAddress=${encodeURIComponent(walletAddress)}`,
          );

          let actualRank = 0;
          if (rankResponse.ok) {
            const rankResult = await rankResponse.json();
            actualRank = rankResult.rank || 0;
          }

          setUserStats({
            rank: actualRank,
            total_points: player.total_points || 0,
            total_checkins: player.total_checkins || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setIsLoadingUserStats(false);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300";
      case 2:
        return "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300";
      case 3:
        return "bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300";
      default:
        return "bg-white border-gray-200";
    }
  };

  if (!showLeaderboard) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleOpen}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
        >
          <Trophy className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <h2 className="text-2xl font-bold font-inktrap">Leaderboard</h2>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              className="text-white hover:bg-white/20 p-1"
            >
              ✕
            </Button>
          </div>
          <p className="text-purple-100 mt-2">Top 50 players by total points</p>
        </div>

        {/* Your Rank Section */}
        {currentUserAddress && (
          <div className="p-4 border-b bg-gradient-to-br from-yellow-50 to-orange-50">
            {isLoadingUserStats ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : userStats ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    {userStats.rank <= 3 ? (
                      <Crown className="w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {userStats.rank}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Your Rank
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      #{userStats.rank}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 font-medium">
                    Your Stats
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold">
                        {userStats.total_points.toLocaleString()} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-600">
                        {userStats.total_checkins} checkins
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-gray-600 text-sm">
                  Start checking in to see your rank!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Content */}
        <div className="p-4 overflow-y-auto max-h-96">
          {isLeaderboardLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No players yet!</p>
              <p className="text-sm text-gray-500">
                Be the first to check in and earn points
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((player) => {
                const isCurrentUser =
                  player.wallet_address === currentUserAddress;
                return (
                  <div
                    key={player.player_id}
                    className={`p-4 rounded-lg border-2 ${
                      isCurrentUser
                        ? "bg-purple-50 border-purple-400 ring-2 ring-purple-300"
                        : getRankColor(player.rank)
                    } transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCurrentUser
                            ? "bg-purple-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        {player.rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User
                            className={`w-4 h-4 ${
                              isCurrentUser
                                ? "text-purple-600"
                                : "text-gray-500"
                            }`}
                          />
                          <p
                            className={`font-mono text-sm truncate ${
                              isCurrentUser
                                ? "text-purple-900 font-semibold"
                                : "text-gray-800"
                            }`}
                          >
                            {player.username ||
                              formatWalletAddress(player.wallet_address)}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-purple-600">
                                (You)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-yellow-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              {player.total_points.toLocaleString()} pts
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-gray-600">
                              {player.total_checkins} checkins
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <p className="text-xs text-gray-500 text-center mb-2">
            Showing top {leaderboard.length} players
          </p>
          <Button
            onClick={() => fetchLeaderboard(50)}
            disabled={isLeaderboardLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLeaderboardLoading ? "Refreshing..." : "Refresh Leaderboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
