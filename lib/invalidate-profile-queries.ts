import type { QueryClient } from '@tanstack/react-query';

/** Refetch dashboard hooks (`useUserProfile`, player stats, activities) after profile writes. */
export function invalidateProfileRelatedQueries(
  queryClient: QueryClient,
  walletAddress: string
) {
  void queryClient.invalidateQueries({
    queryKey: ['user-profile', walletAddress],
  });
  void queryClient.invalidateQueries({ queryKey: ['player', walletAddress] });
  void queryClient.invalidateQueries({
    queryKey: ['player-rank', walletAddress],
  });
  void queryClient.invalidateQueries({
    queryKey: ['player-activities', walletAddress],
  });
}
