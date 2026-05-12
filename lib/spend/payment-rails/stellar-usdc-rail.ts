import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import { ensureStellarRailUserWallet } from '@/lib/privy/stellar-rail-wallet';
import {
  insertPendingSpendWalletReadinessOrGet,
  updateSpendWalletReadinessFields,
} from '@/lib/db/spend-wallet-readiness';
import { updateSpendSessionRailUserWalletAddress } from '@/lib/db/spend-sessions';
import {
  errSpendRail,
  okSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentPrepareRailValue,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import {
  spendRailErrorConversionFundingNotSupported,
  spendRailErrorNetworkUnavailable,
  spendRailErrorRailOperationNotSupported,
  spendRailErrorWalletReadinessFailed,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
  SpendRailPaymentOperationStatus,
} from '@/lib/spend/payment-rails/types';

const unsupported = (): SpendRailResult<never> =>
  errSpendRail(spendRailErrorRailOperationNotSupported());

const conversionFundingUnsupported = (): SpendRailResult<never> =>
  errSpendRail(spendRailErrorConversionFundingNotSupported());

function classifyStellarReadinessException(e: unknown): SpendRailError {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econn') ||
    msg.includes('timeout') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('socket')
  ) {
    return spendRailErrorNetworkUnavailable();
  }
  return spendRailErrorWalletReadinessFailed();
}

function internalDiagnosticsFromError(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    return {
      error_name: e.name,
      error_message: e.message.slice(0, 4000),
    };
  }
  return { error_message: String(e).slice(0, 4000) };
}

/**
 * Stellar USDC rail: wallet readiness provisions a Privy-managed Stellar account on
 * conversion confirm (IRL-21). Funding/payment remain stubbed until follow-up issues.
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
      const sessionId = ctx.spendSessionId?.trim();
      if (!sessionId) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }
      const privyUserId = ctx.sessionOwnerPrivyUserId?.trim();
      if (!privyUserId) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }

      const { row } = await insertPendingSpendWalletReadinessOrGet({
        spendSessionId: sessionId,
        userId: privyUserId,
        spendRail,
        railUserWalletAddress: null,
      });

      if (row.status === 'completed') {
        return okSpendRail({ status: 'completed' });
      }

      try {
        const stellar = await ensureStellarRailUserWallet(privyUserId);
        await updateSpendWalletReadinessFields(row.id, {
          status: 'completed',
          rail_user_wallet_address: stellar.address,
          step_metadata: {
            stellar_wallet_provisioned: stellar.provisioned,
          },
          sanitized_error_category: null,
          sanitized_error_code: null,
          internal_diagnostics: null,
        });
        await updateSpendSessionRailUserWalletAddress(
          sessionId,
          stellar.address
        );
        return okSpendRail({ status: 'completed' });
      } catch (e) {
        console.error('stellar_usdc runWalletReadinessOrchestration:', e);
        const railErr = classifyStellarReadinessException(e);
        try {
          await updateSpendWalletReadinessFields(row.id, {
            status: 'failed',
            sanitized_error_category: railErr.category,
            sanitized_error_code: railErr.analyticsCode,
            internal_diagnostics: internalDiagnosticsFromError(e),
          });
        } catch (persistErr) {
          console.error(
            'stellar_usdc readiness failure metadata persist:',
            persistErr
          );
        }
        return errSpendRail(railErr);
      }
    },

    async initiateUserFunding(ctx: SpendPaymentRailSessionContext): Promise<
      SpendRailResult<{
        status: SpendRailFundingOperationStatus;
        txReference?: string | null;
      }>
    > {
      void ctx;
      return conversionFundingUnsupported();
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<SpendPaymentPrepareRailValue>> {
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
