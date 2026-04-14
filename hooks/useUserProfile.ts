import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { UserProfile } from '@/lib/types';

/**
 * Fetches extended profile (social handles, etc.) for the given wallet.
 */
export function useUserProfile(walletAddress?: string) {
  return useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: () =>
      apiClient<UserProfile>(
        `/api/profile?wallet_address=${encodeURIComponent(walletAddress!)}`
      ),
    enabled: !!walletAddress,
  });
}
