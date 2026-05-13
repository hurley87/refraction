import type { SpendPilotSanitizedErrorFields } from '@/lib/analytics/types';
import type { SpendRail } from '@/lib/types';
import type {
  SpendRailAnalyticsCode,
  SpendRailError,
  SpendRailErrorCategory,
} from '@/lib/spend/payment-rails/errors';

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
  const { network, asset } = SPEND_RAIL_MIXPANEL_STATIC[spendRail];
  return { spend_rail: spendRail, network, asset };
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

/**
 * Maps persisted wallet-readiness row strings to Mixpanel-safe error fields,
 * or falls back when the row predates sanitized columns.
 */
export function spendPilotSanitizedFieldsFromWalletReadinessRow(
  category: string | null | undefined,
  code: string | null | undefined,
  fallbackError: SpendRailError
): SpendPilotSanitizedErrorFields {
  if (category != null && code != null) {
    return {
      sanitized_error_category: category as SpendRailErrorCategory,
      sanitized_error_code: code as SpendRailAnalyticsCode,
    };
  }
  return spendPilotSanitizedRailErrorFields(fallbackError);
}
