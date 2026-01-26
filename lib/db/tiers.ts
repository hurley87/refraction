import { supabase } from './client';
import type { Tier } from '../types';

// Select specific columns for tier queries
const TIER_COLUMNS = `
  id,
  title,
  min_points,
  max_points,
  description,
  created_at,
  updated_at
`;

/**
 * Get all tiers ordered by minimum points
 */
export const getTiers = async (): Promise<Tier[]> => {
  const { data, error } = await supabase
    .from('tiers')
    .select(TIER_COLUMNS)
    .order('min_points', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Tier[];
};

/**
 * Resolve which tier a player belongs to based on their total points
 */
export const resolveTierForPoints = (
  tiers: Tier[],
  totalPoints: number
): Tier | null => {
  return (
    tiers.find(
      (tier) =>
        totalPoints >= tier.min_points &&
        (tier.max_points === null || totalPoints < tier.max_points)
    ) ?? null
  );
};

/**
 * Get the tier for a given point total
 */
export const getTierForPoints = async (
  totalPoints: number
): Promise<Tier | null> => {
  const tiers = await getTiers();
  return resolveTierForPoints(tiers, totalPoints);
};
