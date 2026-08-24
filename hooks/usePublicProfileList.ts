import { useQuery } from '@tanstack/react-query';
import type { PublicCustomListWithLocations } from '@/lib/db/player-custom-lists';

async function fetchPublicProfileList(
  listId: string
): Promise<PublicCustomListWithLocations> {
  const response = await fetch(
    `/api/public-lists/id/${encodeURIComponent(listId)}`
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch list');
  }

  const data = result.data ?? result;
  return data.list as PublicCustomListWithLocations;
}

/** Fetch a non-private custom list for public-profile deep links. */
export function usePublicProfileList(listId: string | undefined) {
  const trimmedId = listId?.trim() ?? '';

  return useQuery({
    queryKey: ['public-profile-list', trimmedId],
    queryFn: () => fetchPublicProfileList(trimmedId),
    enabled: trimmedId.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
