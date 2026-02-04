import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LocationSuggestion {
  place_id: string;
  name: string;
  lat: string;
  lon: string;
  type?: string;
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

async function performCheckinRequest(
  data: CheckinData
): Promise<CheckinResponse> {
  const response = await fetch('/api/location-checkin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result;
}

async function fetchPlayerData(walletAddress: string) {
  const response = await fetch(
    `/api/location-checkin?walletAddress=${encodeURIComponent(walletAddress)}`
  );
  const result = await response.json();

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Player doesn't exist yet
    }
    throw new Error(result.error || 'Failed to get player data');
  }

  return result.player;
}

async function fetchLeaderboard(
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`/api/leaderboard?limit=${limit}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch leaderboard');
  }

  return result.leaderboard;
}

async function fetchPlayerStats(playerId: number) {
  const response = await fetch(`/api/leaderboard?playerId=${playerId}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get player stats');
  }

  return result.playerStats;
}

export const useLocationGame = () => {
  const queryClient = useQueryClient();

  // Mutation for checkin
  const { mutateAsync: performCheckin, isPending: isCheckinLoading } =
    useMutation({
      mutationFn: performCheckinRequest,
      onSuccess: (result) => {
        toast.success(
          result.message || `You earned ${result.pointsEarned} points!`
        );
        // Invalidate leaderboard queries after successful checkin
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['playerStats'] });
      },
      onError: (error: any) => {
        if (error.alreadyCheckedIn) {
          toast.error("You've already checked in at this location!");
        } else {
          toast.error(error.error || 'Failed to check in');
        }
      },
    });

  // Query for leaderboard
  const useLeaderboard = (limit: number = 50) => {
    return useQuery({
      queryKey: ['leaderboard', limit],
      queryFn: () => fetchLeaderboard(limit),
      staleTime: 30_000, // 30 seconds
    });
  };

  // Query for player stats
  const usePlayerStats = (playerId: number | undefined) => {
    return useQuery({
      queryKey: ['playerStats', playerId],
      queryFn: () => fetchPlayerStats(playerId!),
      enabled: !!playerId,
      staleTime: 30_000, // 30 seconds
    });
  };

  // Query for player data
  const usePlayerData = (walletAddress: string | undefined) => {
    return useQuery({
      queryKey: ['playerData', walletAddress],
      queryFn: () => fetchPlayerData(walletAddress!),
      enabled: !!walletAddress,
      staleTime: 60_000, // 1 minute
    });
  };

  return {
    // Checkin mutation
    performCheckin: async (data: CheckinData) => {
      try {
        return await performCheckin(data);
      } catch (error) {
        return null;
      }
    },
    isCheckinLoading,

    // Query hooks (returned as functions so they can be called conditionally)
    useLeaderboard,
    usePlayerStats,
    usePlayerData,

    // Direct fetch functions for backward compatibility
    getPlayerData: async (walletAddress: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: ['playerData', walletAddress],
        queryFn: () => fetchPlayerData(walletAddress),
      });
      return result;
    },
    fetchLeaderboard: async (limit: number = 50) => {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: ['leaderboard', limit],
          queryFn: () => fetchLeaderboard(limit),
        });
        return result;
      } catch (error) {
        console.error('Leaderboard error:', error);
        toast.error('Failed to load leaderboard');
        return [];
      }
    },
    getPlayerStats: async (playerId: number) => {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: ['playerStats', playerId],
          queryFn: () => fetchPlayerStats(playerId),
        });
        return result;
      } catch (error) {
        console.error('Player stats error:', error);
        return null;
      }
    },
  };
};
