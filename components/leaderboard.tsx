"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationGame } from "@/hooks/useLocationGame";

export default function Leaderboard() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { fetchLeaderboard, leaderboard, isLeaderboardLoading } =
    useLocationGame();

  useEffect(() => {
    if (showLeaderboard && leaderboard.length === 0) {
      fetchLeaderboard(20);
    }
  }, [showLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">
            #{rank}
          </span>
        );
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
          onClick={() => setShowLeaderboard(true)}
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
              onClick={() => setShowLeaderboard(false)}
              variant="ghost"
              className="text-white hover:bg-white/20 p-1"
            >
              ✕
            </Button>
          </div>
          <p className="text-purple-100 mt-2">Top players by total points</p>
        </div>

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
              {leaderboard.map((player) => (
                <div
                  key={player.player_id}
                  className={`p-4 rounded-lg border-2 ${getRankColor(
                    player.rank
                  )} transition-all hover:shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRankIcon(player.rank)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <p className="font-mono text-sm text-gray-800 truncate">
                            {player.username ||
                              formatWalletAddress(player.wallet_address)}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <Button
            onClick={() => fetchLeaderboard(20)}
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
