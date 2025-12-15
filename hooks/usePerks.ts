import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Perk, UserPerkRedemption } from "@/lib/types";

/**
 * Hook to fetch perks list
 * @param activeOnly - Whether to fetch only active perks (default: true)
 */
export function usePerks(activeOnly = true) {
  return useQuery<Perk[]>({
    queryKey: ["perks", activeOnly],
    queryFn: async () => {
      const data = await apiClient<{ perks: Perk[] }>(
        `/api/perks?activeOnly=${activeOnly}`,
      );
      return data.perks;
    },
  });
}

/**
 * Hook to fetch available codes count for a perk
 * @param perkId - The perk ID to check
 */
export function useAvailableCodesCount(perkId?: string) {
  return useQuery<number>({
    queryKey: ["available-codes", perkId],
    queryFn: async () => {
      if (!perkId) return 0;
      const data = await apiClient<{ count: number }>(
        `/api/perks/${perkId}/available-count`,
      );
      return data.count;
    },
    enabled: !!perkId,
  });
}

/**
 * Hook to fetch user's perk redemptions
 * @param address - User's wallet address
 */
export function useUserRedemptions(address?: string) {
  return useQuery<UserPerkRedemption[]>({
    queryKey: ["user-redemptions", address],
    queryFn: async () => {
      if (!address) return [];
      const data = await apiClient<{ redemptions: UserPerkRedemption[] }>(
        `/api/user/redemptions?walletAddress=${encodeURIComponent(address)}`,
      );
      return data.redemptions;
    },
    enabled: !!address,
  });
}
