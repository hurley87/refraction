import { supabase } from './client';
import type { PlayerLocationCheckin, VisitStatus } from '../types';

// Select specific columns for checkin queries
const CHECKIN_COLUMNS = `
  id,
  player_id,
  location_id,
  points_earned,
  visit_status,
  checkin_at,
  created_at,
  comment,
  image_url
`;

/**
 * Check if a user has already checked in to a specific location
 */
export const checkUserLocationCheckin = async (
  playerId: number,
  locationId: number
) => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .select(CHECKIN_COLUMNS)
    .eq('player_id', playerId)
    .eq('location_id', locationId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/** True when this player has been to the location. Want to try does not count. */
export const hasPlayerLocationCheckin = async (
  playerId: number,
  locationId: number
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .select('id')
    .eq('player_id', playerId)
    .eq('location_id', locationId)
    .eq('visit_status', 'been')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data != null;
};

/**
 * Record want to try or been for a player and place.
 * A been row stays been unless allowDowngrade is set, which is reserved
 * for an explicit Want to try press.
 * New rows earn no points; check-in points stay on the check-in route.
 */
export const setPlayerVisitStatus = async (
  playerId: number,
  locationId: number,
  visitStatus: VisitStatus,
  comment?: string | null,
  options?: { allowDowngrade?: boolean }
): Promise<void> => {
  const { data: existing, error: existingError } = await supabase
    .from('player_location_checkins')
    .select('id, visit_status, checkin_at')
    .eq('player_id', playerId)
    .eq('location_id', locationId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const currentStatus: VisitStatus | null = existing
    ? existing.visit_status === 'want_to_try'
      ? 'want_to_try'
      : 'been'
    : null;

  if (
    !options?.allowDowngrade &&
    currentStatus === 'been' &&
    visitStatus === 'want_to_try'
  ) {
    return;
  }

  const savedComment =
    visitStatus === 'been' && comment?.trim()
      ? comment.trim().slice(0, 500)
      : null;
  /** A string (even empty) replaces the player's single comment; omitted leaves it. */
  const writesComment = visitStatus === 'been' && typeof comment === 'string';

  if (!existing) {
    const { error } = await supabase.from('player_location_checkins').insert({
      player_id: playerId,
      location_id: locationId,
      points_earned: 0,
      visit_status: visitStatus,
      checkin_at: new Date().toISOString(),
      comment: savedComment,
    });
    if (error) throw error;
    return;
  }

  if (currentStatus === visitStatus && !writesComment) return;

  const update: {
    visit_status: VisitStatus;
    comment?: string | null;
    checkin_at?: string;
  } = { visit_status: visitStatus };
  if (writesComment) update.comment = savedComment;
  if (visitStatus === 'been' && !existing.checkin_at) {
    update.checkin_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('player_location_checkins')
    .update(update)
    .eq('id', existing.id);

  if (error) throw error;
};

/**
 * Create a new location check-in record
 */
export const createLocationCheckin = async (
  checkin: Omit<PlayerLocationCheckin, 'id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .insert({ ...checkin, visit_status: 'been' as const })
    .select(CHECKIN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Turn a want-to-try row into a check-in. Awards the visit on the existing row
 * so the player does not end up with two rows for one place.
 */
export const completeWantToTryCheckin = async (
  checkinId: number,
  checkin: Pick<
    PlayerLocationCheckin,
    'points_earned' | 'checkin_at' | 'comment' | 'image_url'
  >
) => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .update({
      ...checkin,
      visit_status: 'been',
    })
    .eq('id', checkinId)
    .select(CHECKIN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};
