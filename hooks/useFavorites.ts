import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Location } from '@/lib/types';

interface ToggleFavoriteInput {
  walletAddress: string;
  placeId: string;
  favorited: boolean;
}

interface FavoritesResponse {
  placeIds: string[];
  locations?: Location[];
}

async function fetchFavoritePlaceIds(walletAddress: string): Promise<string[]> {
  const params = new URLSearchParams({ walletAddress });
  const response = await fetch(`/api/location-favorite?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch favorites');
  }

  const data = (result.data ?? result) as FavoritesResponse;
  return data.placeIds ?? [];
}

export async function fetchFavoriteLocations(
  walletAddress: string
): Promise<Location[]> {
  const params = new URLSearchParams({
    walletAddress,
    includeLocations: 'true',
  });
  const response = await fetch(`/api/location-favorite?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch favorites');
  }

  const data = (result.data ?? result) as FavoritesResponse;
  return data.locations ?? [];
}

async function toggleFavoriteRequest(
  input: ToggleFavoriteInput
): Promise<{ favorited: boolean; placeId: string }> {
  const response = await fetch('/api/location-favorite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update favorite');
  }

  return (result.data ?? result) as { favorited: boolean; placeId: string };
}

/** Favorited place_ids for map toggle state. */
export function useFavoritePlaceIds(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['favorites', walletAddress],
    queryFn: () => fetchFavoritePlaceIds(walletAddress!),
    enabled: Boolean(walletAddress),
    staleTime: 60_000,
    select: (placeIds) => new Set(placeIds),
  });
}

/** Full favorite location rows for drawer/dashboard. */
export function useFavoriteLocations(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['favorites', walletAddress, 'locations'],
    queryFn: () => fetchFavoriteLocations(walletAddress!),
    enabled: Boolean(walletAddress),
    staleTime: 60_000,
  });
}

/** Toggle favorite with optimistic placeId set updates. */
export function useToggleFavorite(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavoriteRequest,
    onMutate: async (input) => {
      if (!walletAddress) return;

      await queryClient.cancelQueries({
        queryKey: ['favorites', walletAddress],
      });

      const previousPlaceIds = queryClient.getQueryData<string[]>([
        'favorites',
        walletAddress,
      ]);

      queryClient.setQueryData<string[]>(
        ['favorites', walletAddress],
        (old) => {
          const current = old ?? [];
          if (input.favorited) {
            return current.includes(input.placeId)
              ? current
              : [input.placeId, ...current];
          }
          return current.filter((id) => id !== input.placeId);
        }
      );

      return { previousPlaceIds };
    },
    onError: (_error, _input, context) => {
      if (!walletAddress) return;
      if (context?.previousPlaceIds) {
        queryClient.setQueryData(
          ['favorites', walletAddress],
          context.previousPlaceIds
        );
      }
      toast.error('Failed to update favorite');
    },
    onSettled: () => {
      if (!walletAddress) return;
      queryClient.invalidateQueries({ queryKey: ['favorites', walletAddress] });
    },
  });
}
