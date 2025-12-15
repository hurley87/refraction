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

