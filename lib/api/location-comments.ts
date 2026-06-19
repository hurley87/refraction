export type LocationCommentsPurpose = 'full' | 'avatars';

export const MAX_BATCH_PLACE_IDS = 30;
export const AVATAR_CACHE_CONTROL = 's-maxage=60, stale-while-revalidate=120';

export type RawCheckinRow = {
  id: number;
  location_id?: number;
  comment?: string | null;
  image_url?: string | null;
  points_earned?: number | null;
  created_at?: string | null;
  checkin_at?: string | null;
  players?:
    | {
        username?: string | null;
        wallet_address?: string | null;
        profile_picture_url?: string | null;
      }
    | Array<{
        username?: string | null;
        wallet_address?: string | null;
        profile_picture_url?: string | null;
      }>
    | null;
};

export type ShapedCheckin = {
  id: number;
  comment?: string | null;
  imageUrl?: string | null;
  pointsEarned?: number | null;
  createdAt?: string | null;
  username: string | null;
  walletAddress: string | null;
  profilePictureUrl: string | null;
};

export function parsePurpose(value: string | null): LocationCommentsPurpose {
  return value === 'avatars' ? 'avatars' : 'full';
}

export function parseLimit(
  limitParam: string | null,
  defaultLimit: number
): number {
  return Math.max(
    1,
    Math.min(
      parseInt(limitParam || String(defaultLimit), 10) || defaultLimit,
      20
    )
  );
}

export function parsePlaceIds(
  placeIdsParam: string | null,
  singlePlaceId: string | null
): string[] {
  if (placeIdsParam?.trim()) {
    const ids = placeIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(ids)].slice(0, MAX_BATCH_PLACE_IDS);
  }

  if (singlePlaceId?.trim()) {
    return [singlePlaceId.trim()];
  }

  return [];
}

export function extractPlayer(players: RawCheckinRow['players']): {
  username?: string | null;
  wallet_address?: string | null;
  profile_picture_url?: string | null;
} | null {
  if (!players) return null;
  return Array.isArray(players) ? (players[0] ?? null) : players;
}

export function shapeCheckinEntry(
  entry: RawCheckinRow,
  purpose: LocationCommentsPurpose
): ShapedCheckin {
  const player = extractPlayer(entry.players);
  const shaped: ShapedCheckin = {
    id: entry.id,
    username: player?.username || null,
    walletAddress: player?.wallet_address || null,
    profilePictureUrl: player?.profile_picture_url || null,
  };

  if (purpose === 'full') {
    shaped.comment = entry.comment;
    shaped.imageUrl = entry.image_url;
    shaped.pointsEarned = entry.points_earned;
    shaped.createdAt = entry.created_at || entry.checkin_at;
  }

  return shaped;
}

/** Group globally-ordered check-in rows into top N per place id. */
export function groupCheckinsByPlaceId(
  rows: RawCheckinRow[],
  locationIdToPlaceId: Map<number, string>,
  limitPerPlace: number,
  purpose: LocationCommentsPurpose
): Record<string, ShapedCheckin[]> {
  const counts = new Map<string, number>();
  const result: Record<string, ShapedCheckin[]> = {};

  for (const row of rows) {
    const locationId = row.location_id;
    if (locationId == null) continue;

    const placeId = locationIdToPlaceId.get(locationId);
    if (!placeId) continue;

    const currentCount = counts.get(placeId) ?? 0;
    if (currentCount >= limitPerPlace) continue;

    if (!result[placeId]) {
      result[placeId] = [];
    }

    result[placeId].push(shapeCheckinEntry(row, purpose));
    counts.set(placeId, currentCount + 1);
  }

  return result;
}

export function isTransientCheckinsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string; status?: number };
  if (record.status === 503) return true;
  if (record.code === 'PGRST003') return true;
  const message = record.message?.toLowerCase() ?? '';
  return message.includes('503') || message.includes('timeout');
}
