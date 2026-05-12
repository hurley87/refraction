import type { SpendRail } from '@/lib/types';
import {
  errSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import { spendRailErrorRailOperationNotSupported } from '@/lib/spend/payment-rails/errors';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
  SpendRailPaymentOperationStatus,
  SpendWalletReadinessStatus,
} from '@/lib/spend/payment-rails/types';

const unsupported = (): SpendRailResult<never> =>
  errSpendRail(spendRailErrorRailOperationNotSupported());

/**
 * Stellar USDC rail: registered for typing and shared errors; orchestration methods return
 * categorized "not supported in this release" until IRL-19 / IRL-21 / IRL-14-style extraction.
 */
export function createStellarUsdcSpendPaymentRail(): SpendPaymentRail {
  const spendRail: SpendRail = 'stellar_usdc';
  const notSupported = unsupported;

  return {
    spendRail,

    async getTreasurySpendableBalance(): Promise<
      SpendRailResult<number | null>
    > {
      return notSupported();
    },

    async runWalletReadinessOrchestration(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendWalletReadinessStatus }>> {
      void ctx;
      return notSupported();
    },

    async initiateUserFunding(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailFundingOperationStatus }>> {
      void ctx;
      return notSupported();
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      void ctx;
      return notSupported();
    },

    async confirmPayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      void ctx;
      return notSupported();
    },

    explorerUrlForLedgerTx(
      txReference: string | null | undefined
    ): string | null {
      return spendPaymentRailExplorerUrl(spendRail, txReference);
    },

    async reconcilePendingOperations(
      ctx: SpendPaymentRailReconcileContext
    ): Promise<SpendRailResult<void>> {
      void ctx;
      return notSupported();
    },

    assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void> {
      return notSupported();
    },
  };
}
