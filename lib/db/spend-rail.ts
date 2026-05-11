import type { SpendRail } from '@/lib/types';

/** Coerce a DB/text value to a known spend rail (unknown values → base_usdc). */
export function normalizeSpendRail(value: unknown): SpendRail {
  if (value === 'stellar_usdc') return 'stellar_usdc';
  return 'base_usdc';
}
