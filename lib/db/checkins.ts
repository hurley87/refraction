import { supabase } from './client';
import type { PlayerLocationCheckin } from '../types';

// Select specific columns for checkin queries
const CHECKIN_COLUMNS = `
  id,
  player_id,
  location_id,
  points_earned,
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

/**
 * Create a new location check-in record
 */
export const createLocationCheckin = async (
  checkin: Omit<PlayerLocationCheckin, 'id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .insert(checkin)
    .select(CHECKIN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};
