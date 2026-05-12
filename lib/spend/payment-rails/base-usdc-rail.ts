import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import {
  okSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
  SpendRailPaymentOperationStatus,
} from '@/lib/spend/payment-rails/types';

/**
 * Base USDC rail: user-signed EVM flows today; additional orchestration moves behind this
 * object in IRL-14 / follow-on issues.
 */
export function createBaseUsdcSpendPaymentRail(): SpendPaymentRail {
  const spendRail: SpendRail = 'base_usdc';

  return {
    spendRail,

    async getTreasurySpendableBalance(): Promise<
      SpendRailResult<number | null>
    > {
      return okSpendRail(null);
    },

    async runWalletReadinessOrchestration(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendWalletReadinessStatus }>> {
      void ctx;
      return okSpendRail({ status: 'completed' });
    },

    async initiateUserFunding(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailFundingOperationStatus }>> {
      void ctx;
      return okSpendRail({ status: 'pending' });
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      void ctx;
      return okSpendRail({ status: 'prepared' });
    },

    async confirmPayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      void ctx;
      return okSpendRail({ status: 'submitted' });
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
      return okSpendRail(undefined);
    },

    assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void> {
      return okSpendRail(undefined);
    },
  };
}
