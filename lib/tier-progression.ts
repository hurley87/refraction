import { getTiers, resolveTierForPoints } from '@/lib/db/tiers';
import {
  trackTierProgression,
  setUserProperties as setUserPropertiesServer,
} from '@/lib/analytics/server';

/**
 * After a points change, resolve the user's new tier, update the Mixpanel
 * `tier` user property, and fire a `tier_progression` event when the tier
 * actually changed.
 *
 * Safe to call from any server-side code path that modifies player points.
 * Errors are caught internally so callers are never blocked.
 *
 * @param distinctId - Mixpanel distinct ID (wallet address)
 * @param previousPoints - Points total *before* the change
 * @param newPoints - Points total *after* the change
 */
export async function checkAndTrackTierProgression(
  distinctId: string,
  previousPoints: number,
  newPoints: number
): Promise<void> {
  try {
    const tiers = await getTiers();
    if (tiers.length === 0) return;

    const previousTier = resolveTierForPoints(tiers, previousPoints);
    const newTier = resolveTierForPoints(tiers, newPoints);

    const newTierTitle = newTier?.title ?? 'Unknown';

    // Always sync the tier user property so it stays up-to-date
    setUserPropertiesServer(distinctId, {
      tier: newTierTitle,
      total_points: newPoints,
    });

    // Fire tier_progression event only when the tier actually changed
    if (previousTier?.id !== newTier?.id) {
      trackTierProgression(distinctId, {
        previous_tier: previousTier?.title ?? 'Unknown',
        new_tier: newTierTitle,
        total_points: newPoints,
      });
    }
  } catch (error) {
    console.error('Failed to check/track tier progression:', error);
  }
}
