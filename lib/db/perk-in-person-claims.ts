import { supabase } from './client';
import type { PerkInPersonClaim } from '../types';
import { getUtcNoonDayWindow } from '../perks/utc-noon-day-window';

export { isClaimedToday } from '../perks/claim-cap';

const CLAIM_COLUMNS = `
  id,
  perk_id,
  user_wallet_address,
  claimed_at
`;

/**
 * Count in-person claims for a wallet+perk inside [start, end).
 */
export async function countInPersonClaimsInWindow(
  walletAddress: string,
  perkId: string,
  start: Date,
  end: Date
): Promise<number> {
  const { count, error } = await supabase
    .from('perk_in_person_claims')
    .select('id', { count: 'exact', head: true })
    .eq('perk_id', perkId)
    .eq('user_wallet_address', walletAddress)
    .gte('claimed_at', start.toISOString())
    .lt('claimed_at', end.toISOString());

  if (error) throw error;
  return count ?? 0;
}

/**
 * Claims in the current UTC-12:00 day window for this wallet+perk.
 */
export async function countInPersonClaimsToday(
  walletAddress: string,
  perkId: string,
  now: Date = new Date()
): Promise<number> {
  const { start, end } = getUtcNoonDayWindow(now);
  return countInPersonClaimsInWindow(walletAddress, perkId, start, end);
}

/**
 * Insert an in-person claim row.
 */
export async function recordInPersonClaim(
  walletAddress: string,
  perkId: string
): Promise<PerkInPersonClaim> {
  const { data, error } = await supabase
    .from('perk_in_person_claims')
    .insert({
      perk_id: perkId,
      user_wallet_address: walletAddress,
    })
    .select(CLAIM_COLUMNS)
    .single();

  if (error) throw error;
  return data as PerkInPersonClaim;
}
