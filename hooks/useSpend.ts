import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { SpendItem, SpendRedemption } from '@/lib/types';

/**
 * Hook to fetch active spend items
 */
export function useSpendItems() {
  return useQuery<SpendItem[]>({
    queryKey: ['spend-items'],
    queryFn: async () => {
      const data = await apiClient<{ items: SpendItem[] }>('/api/spend');
      return data.items;
    },
  });
}

/**
 * Hook to fetch a single spend item
 */
export function useSpendItem(id?: string) {
  return useQuery<SpendItem>({
    queryKey: ['spend-item', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const data = await apiClient<{ item: SpendItem }>(`/api/spend/${id}`);
      return data.item;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a pending redemption (no point deduction). User verifies later to deduct points.
 */
export function useSpendPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spendItemId,
      walletAddress,
    }: {
      spendItemId: string;
      walletAddress: string;
    }) => {
      const data = await apiClient<{ redemption: SpendRedemption }>(
        `/api/spend/${spendItemId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }
      );
      return data.redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-spend-redemptions'] });
    },
  });
}

/**
 * Hook to verify a pending redemption (deducts points and marks fulfilled).
 */
export function useVerifySpendRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      redemptionId,
      walletAddress,
    }: {
      redemptionId: string;
      walletAddress: string;
    }) => {
      const data = await apiClient<{ redemption: SpendRedemption }>(
        `/api/spend/redemptions/${redemptionId}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }
      );
      return data.redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player'] });
      queryClient.invalidateQueries({ queryKey: ['spend-items'] });
      queryClient.invalidateQueries({ queryKey: ['user-spend-redemptions'] });
    },
  });
}

/**
 * Hook to fetch a user's spend redemption history
 */
export function useUserSpendRedemptions(walletAddress?: string) {
  return useQuery<SpendRedemption[]>({
    queryKey: ['user-spend-redemptions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const data = await apiClient<{ redemptions: SpendRedemption[] }>(
        `/api/spend?walletAddress=${encodeURIComponent(walletAddress)}`
      );
      return data.redemptions;
    },
    enabled: !!walletAddress,
  });
}
