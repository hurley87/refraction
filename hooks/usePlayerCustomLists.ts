import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Location, PlayerCustomListWithCount } from '@/lib/types';

/** Custom list with its full location rows (drawer "Your lists" section). */
export type PlayerCustomListWithLocations = PlayerCustomListWithCount & {
  locations: Location[];
};

interface CreateListInput {
  walletAddress: string;
  title: string;
  thumbnailUrl?: string | null;
  isPrivate: boolean;
}

interface AddLocationToListsInput {
  walletAddress: string;
  placeId: string;
  listIds: string[];
}

async function fetchPlayerCustomLists(
  walletAddress: string,
  placeId?: string
): Promise<PlayerCustomListWithCount[]> {
  const params = new URLSearchParams({ walletAddress });
  if (placeId) params.set('placeId', placeId);

  const response = await fetch(`/api/player-lists?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch lists');
  }

  const data = result.data ?? result;
  return (data.lists ?? []) as PlayerCustomListWithCount[];
}

/**
 * A player's custom lists with counts. When `placeId` is given, each list
 * reports whether that location is already saved to it.
 */
export function usePlayerCustomLists(
  walletAddress: string | undefined,
  placeId?: string
) {
  return useQuery({
    queryKey: ['player-custom-lists', walletAddress, placeId ?? null],
    queryFn: () => fetchPlayerCustomLists(walletAddress!, placeId),
    enabled: Boolean(walletAddress),
    staleTime: 60_000,
  });
}

async function fetchPlayerCustomListsWithLocations(
  walletAddress: string
): Promise<PlayerCustomListWithLocations[]> {
  const params = new URLSearchParams({
    walletAddress,
    includeLocations: 'true',
  });

  const response = await fetch(`/api/player-lists?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch lists');
  }

  const data = result.data ?? result;
  return (data.lists ?? []) as PlayerCustomListWithLocations[];
}

/** A player's custom lists including full location rows. */
export function usePlayerCustomListLocations(
  walletAddress: string | undefined
) {
  return useQuery({
    queryKey: ['player-custom-lists', walletAddress, 'locations'],
    queryFn: () => fetchPlayerCustomListsWithLocations(walletAddress!),
    enabled: Boolean(walletAddress),
    staleTime: 60_000,
  });
}

/** Create a new custom list. */
export function useCreateCustomList(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateListInput) => {
      const response = await fetch('/api/player-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: input.walletAddress,
          title: input.title,
          isPrivate: input.isPrivate,
          // Omit empty/invalid URLs so Zod `.url()` does not reject the create.
          ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create list');
      }
      return result.data ?? result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['player-custom-lists', walletAddress],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create list');
    },
  });
}

/** Delete one of the player's custom lists (with its saved locations). */
export function useDeleteCustomList(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch('/api/player-lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, listId }),
      });
      // 404 means the list is already gone (deleted elsewhere / stale cache):
      // treat as success so the UI can close and resync.
      if (response.status === 404) {
        return { listId };
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete list');
      }
      return (result.data ?? result) as { listId: string };
    },
    onSuccess: () => {
      toast.success('List deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete list');
    },
    onSettled: () => {
      // Resync even after errors so stale lists disappear from the drawer.
      queryClient.invalidateQueries({
        queryKey: ['player-custom-lists', walletAddress],
      });
    },
  });
}

/** Add a location to one or more of the player's lists. */
export function useAddLocationToLists(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddLocationToListsInput) => {
      const response = await fetch('/api/player-lists/add-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add location to lists');
      }
      return (result.data ?? result) as {
        placeId: string;
        savedListCount: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['player-custom-lists', walletAddress],
      });
    },
    onError: () => {
      toast.error('Failed to add location to lists');
    },
  });
}
