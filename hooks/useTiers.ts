import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Tier } from '@/lib/types';

/**
 * Hook to fetch all tiers
 */
export function useTiers() {
  return useQuery<Tier[]>({
    queryKey: ['tiers'],
    queryFn: async () => {
      const data = await apiClient<{ tiers: Tier[] }>('/api/tiers');
      return data.tiers;
    },
  });
}

