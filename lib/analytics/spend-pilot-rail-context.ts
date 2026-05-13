import type { SpendRail } from '@/lib/types';
import type { SpendRailError } from '@/lib/spend/payment-rails/errors';

const SPEND_RAIL_MIXPANEL_STATIC: Record<
  SpendRail,
  { network: string; asset: string }
> = {
  base_usdc: { network: 'Base', asset: 'USDC' },
  stellar_usdc: { network: 'Stellar', asset: 'USDC' },
};

/**
 * Mixpanel-safe rail slice aligned with `SpendRail` + USDC (IRL-23).
 * Uses stable labels matching `getSpendRailPublicMetadata` defaults (no env reads)
 * so unit tests can mock `@/lib/spend-rail-config` without this helper.
 */
export function spendPilotRailMixpanelFields(spendRail: SpendRail): {
  spend_rail: SpendRail;
  network: string;
  asset: string;
} {
  const x = SPEND_RAIL_MIXPANEL_STATIC[spendRail];
  return {
    spend_rail: spendRail,
    network: x.network,
    asset: x.asset,
  };
}

export function spendPilotSanitizedRailErrorFields(error: SpendRailError): {
  sanitized_error_category: SpendRailError['category'];
  sanitized_error_code: SpendRailError['analyticsCode'];
} {
  return {
    sanitized_error_category: error.category,
    sanitized_error_code: error.analyticsCode,
  };
}
