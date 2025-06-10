import { useState } from "react";
import { toast } from "sonner";

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  name?: string;
  context?: string;
}

interface CheckinData {
  walletAddress: string;
  email?: string;
  username?: string;
  locationData: LocationSuggestion;
}

interface CheckinResponse {
  success: boolean;
  checkin: any;
  player: any;
  location: any;
  pointsEarned: number;
  message: string;
  error?: string;
  alreadyCheckedIn?: boolean;
}

interface LeaderboardEntry {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
}

export const useLocationGame = () => {
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const performCheckin = async (
    data: CheckinData
  ): Promise<CheckinResponse | null> => {
    setIsCheckinLoading(true);

    try {
      const response = await fetch("/api/location-checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.alreadyCheckedIn) {
          toast.error("You've already checked in at this location!");
        } else {
          toast.error(result.error || "Failed to check in");
        }
        return result;
      }

      toast.success(
        result.message || `You earned ${result.pointsEarned} points!`
      );
      return result;
    } catch (error) {
      console.error("Checkin error:", error);
      toast.error("Failed to check in. Please try again.");
      return null;
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const getPlayerData = async (walletAddress: string) => {
    try {
      const response = await fetch(
        `/api/location-checkin?walletAddress=${encodeURIComponent(
          walletAddress
        )}`
      );
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Player doesn't exist yet
        }
        throw new Error(result.error || "Failed to get player data");
      }

      return result.player;
    } catch (error) {
      console.error("Get player data error:", error);
      return null;
    }
  };

  const fetchLeaderboard = async (limit: number = 10) => {
    setIsLeaderboardLoading(true);

    try {
      const response = await fetch(`/api/leaderboard?limit=${limit}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch leaderboard");
      }

      setLeaderboard(result.leaderboard);
      return result.leaderboard;
    } catch (error) {
      console.error("Leaderboard error:", error);
      toast.error("Failed to load leaderboard");
      return [];
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  const getPlayerStats = async (playerId: number) => {
    try {
      const response = await fetch(`/api/leaderboard?playerId=${playerId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get player stats");
      }

      return result.playerStats;
    } catch (error) {
      console.error("Player stats error:", error);
      return null;
    }
  };

  return {
    // State
    isCheckinLoading,
    isLeaderboardLoading,
    leaderboard,

    // Actions
    performCheckin,
    getPlayerData,
    fetchLeaderboard,
    getPlayerStats,
  };
};
