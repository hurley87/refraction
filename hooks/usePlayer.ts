import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { apiClient } from '@/lib/api/client';
import type { Player } from '@/lib/types';

interface PlayerRankResponse {
  rank: number | null;
  total_points: number;
}

interface Activity {
  id: string;
  date: string;
  description: string;
  activityType: string;
  points: number;
  event: string;
  metadata: any;
}

/**
 * Hook to fetch current authenticated player's data
 */
export function useCurrentPlayer() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;

  return useQuery({
    queryKey: ['player', address],
    queryFn: async () => {
      if (!address) return null;
      return apiClient<{ player: Player }>(
        `/api/player?walletAddress=${encodeURIComponent(address)}`
      ).then((data) => data.player);
    },
    enabled: !!address,
  });
}

/**
 * Hook to fetch player's rank
 */
export function usePlayerRank(address?: string) {
  return useQuery<number | null>({
    queryKey: ['player-rank', address],
    queryFn: async () => {
      if (!address) return null;
      const data = await apiClient<PlayerRankResponse>(
        `/api/player/rank?walletAddress=${encodeURIComponent(address)}`
      );
      return data.rank;
    },
    enabled: !!address,
  });
}

/**
 * Hook to fetch player's activities/transactions
 * Note: This API endpoint returns data directly (not wrapped in ApiResponse)
 */
export function usePlayerActivities(address?: string, limit = 20) {
  return useQuery<Activity[]>({
    queryKey: ['player-activities', address, limit],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(
        `/api/activities?wallet_address=${encodeURIComponent(address)}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
    enabled: !!address,
  });
}

/**
 * Interface for user stats (rank and points)
 */
export interface UserStats {
  rank: number;
  total_points: number;
}

/**
 * Hook to fetch combined user stats (rank and points)
 * Returns a unified interface with loading state and default values for new users
 * 
 * @param address - Optional wallet address. If not provided, uses current authenticated user's address
 */
export function useUserStats(address?: string) {
  const { user } = usePrivy();
  const walletAddress = address || user?.wallet?.address;
  
  // Fetch player data - use address if provided, otherwise use current player hook
  const playerQuery = useQuery({
    queryKey: ['player', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      return apiClient<{ player: Player }>(
        `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`
      ).then((data) => data.player);
    },
    enabled: !!walletAddress,
  });

  const { data: rank, isLoading: isLoadingRank } = usePlayerRank(walletAddress);

  const isLoading = playerQuery.isLoading || isLoadingRank;

  // Compute user stats with defaults for new users
  // If player data exists, use it; otherwise return defaults for new users
  const userStats: UserStats | null = walletAddress
    ? playerQuery.data
      ? {
          // Player data exists - use actual values
          rank: rank ?? 999,
          total_points: playerQuery.data.total_points || 0,
        }
      : {
          // No player data yet (new user or still loading) - return defaults
          // This ensures we always have a value to display, even during loading
          rank: 999,
          total_points: 0,
        }
    : null;

  return {
    userStats,
    isLoading,
  };
}

