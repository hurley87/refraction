import type { SpendRail } from '@/lib/types';
import { createBaseUsdcSpendPaymentRail } from '@/lib/spend/payment-rails/base-usdc-rail';
import { createStellarUsdcSpendPaymentRail } from '@/lib/spend/payment-rails/stellar-usdc-rail';
import type { SpendPaymentRail } from '@/lib/spend/payment-rails/spend-payment-rail';

const registry: Record<SpendRail, SpendPaymentRail> = {
  base_usdc: createBaseUsdcSpendPaymentRail(),
  stellar_usdc: createStellarUsdcSpendPaymentRail(),
};

/**
 * Supported entrypoint for spend flow code to branch on `spend_rail` instead of ad hoc string
 * checks (see `getSpendPaymentRail(session.spend_rail)` or experience rail).
 */
export function getSpendPaymentRail(spendRail: SpendRail): SpendPaymentRail {
  return registry[spendRail];
}
