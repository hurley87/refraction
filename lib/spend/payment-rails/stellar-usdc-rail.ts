import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  insertPendingSpendWalletReadinessOrGet,
  updateSpendWalletReadinessFields,
} from '@/lib/db/spend-wallet-readiness';
import { updateSpendSessionRailUserWalletAddress } from '@/lib/db/spend-sessions';
import {
  errSpendRail,
  okSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentConfirmRailValue,
  type SpendPaymentPrepareRailValue,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import {
  isSpendRailError,
  spendRailErrorFundingFailed,
  spendRailErrorInvalidReceivingWallet,
  spendRailErrorNetworkUnavailable,
  spendRailErrorPaymentFailed,
  spendRailErrorStellarTreasuryCannotFundSpend,
  spendRailErrorRailOperationNotSupported,
  spendRailErrorWalletReadinessFailed,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
} from '@/lib/spend/payment-rails/types';
import { runStellarUsdcWalletReadinessOrchestration } from '@/lib/spend/stellar-wallet-readiness-orchestration';
import {
  loadStellarTreasuryAccountWithConfirmedUsdcBalance,
  readStellarTreasuryConfirmedUsdcBalance,
  submitStellarTreasuryUsdcFunding,
} from '@/lib/spend/stellar-treasury-funding';
import { getSpendReceivingWalletAddress } from '@/lib/spend-rail-config';
import { resolveStellarPrivyWalletIdForUser } from '@/lib/privy/stellar-rail-wallet';
import { submitSponsoredStellarUsdcPaymentFromUser } from '@/lib/spend/stellar-spend-payment-submit';
import {
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
} from '@/lib/spend/stellar-wallet-readiness-config';
import type { SpendStellarUsdcBackendSubmitPreparedActionV1 } from '@/lib/spend-payment-prepare-types';

const unsupported = (): SpendRailResult<never> =>
  errSpendRail(spendRailErrorRailOperationNotSupported());

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

function isValidPositiveUsdcAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function classifyStellarPaymentSubmitReason(reason: string): SpendRailError {
  const r = reason.toLowerCase();
  if (
    r.includes('network_submit_failed') ||
    r.includes('horizon') ||
    r.includes('fetch')
  ) {
    return spendRailErrorNetworkUnavailable();
  }
  return spendRailErrorPaymentFailed();
}

/**
 * Stellar USDC rail: hybrid readiness (IRL-18) — sponsor-funded account creation,
 * Privy-signed sponsored USDC trustline, ledger-confirmed completion, treasury audit rows.
 */
export function createStellarUsdcSpendPaymentRail(): SpendPaymentRail {
  const spendRail: SpendRail = 'stellar_usdc';

  return {
    spendRail,

    async getTreasurySpendableBalance(): Promise<
      SpendRailResult<number | null>
    > {
      try {
        const v = await readStellarTreasuryConfirmedUsdcBalance();
        return okSpendRail(v);
      } catch (e) {
        if (isSpendRailError(e)) {
          return errSpendRail(e);
        }
        console.error('stellar_usdc rail getTreasurySpendableBalance:', e);
        return errSpendRail(spendRailErrorNetworkUnavailable());
      }
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
        const readyAddr = row.rail_user_wallet_address?.trim();
        if (readyAddr) {
          try {
            await updateSpendSessionRailUserWalletAddress(sessionId, readyAddr);
          } catch (e) {
            console.error(
              'stellar_usdc completed readiness session address sync:',
              e
            );
            return errSpendRail(classifyStellarReadinessException(e));
          }
        }
        return okSpendRail({ status: 'completed' });
      }

      if (row.status === 'failed') {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }

      try {
        const outcome = await runStellarUsdcWalletReadinessOrchestration({
          readinessRow: row,
          spendSessionId: sessionId,
          spendExperienceId: ctx.spendExperienceId,
          sessionOwnerPrivyUserId: privyUserId,
        });

        if (!outcome.ok) {
          try {
            await updateSpendWalletReadinessFields(row.id, {
              status: 'failed',
              sanitized_error_category: outcome.error.category,
              sanitized_error_code: outcome.error.analyticsCode,
              internal_diagnostics: { phase: 'orchestration_pre_ledger' },
            });
          } catch (persistErr) {
            console.error(
              'stellar_usdc readiness failure metadata persist:',
              persistErr
            );
          }
          return errSpendRail(outcome.error);
        }

        if (outcome.status === 'completed' && outcome.address) {
          try {
            await updateSpendSessionRailUserWalletAddress(
              sessionId,
              outcome.address
            );
          } catch (e) {
            console.error('stellar_usdc readiness session address sync:', e);
            return errSpendRail(classifyStellarReadinessException(e));
          }
        }

        return okSpendRail({ status: outcome.status });
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
      const fundingRef = ctx.fundingReferenceId?.trim();
      if (!fundingRef) {
        return errSpendRail(spendRailErrorFundingFailed());
      }
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const destRaw = ctx.embeddedEvmWalletAddress?.trim() ?? '';
      const destOk = stellarWalletAddressSchema.safeParse(destRaw);
      if (!destOk.success) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }

      let treasurySnapshot: Awaited<
        ReturnType<typeof loadStellarTreasuryAccountWithConfirmedUsdcBalance>
      >;
      try {
        treasurySnapshot =
          await loadStellarTreasuryAccountWithConfirmedUsdcBalance();
        if (treasurySnapshot.balance < ctx.usdcAmount) {
          return errSpendRail(spendRailErrorStellarTreasuryCannotFundSpend());
        }
      } catch (e) {
        if (isSpendRailError(e)) {
          return errSpendRail(e);
        }
        console.error('stellar_usdc initiateUserFunding balance read:', e);
        return errSpendRail(spendRailErrorNetworkUnavailable());
      }

      let sub;
      try {
        sub = await submitStellarTreasuryUsdcFunding({
          destinationPublicKey: destOk.data,
          usdcAmount: ctx.usdcAmount,
          fundingReferenceId: fundingRef,
          cachedTreasuryAccount: treasurySnapshot.account,
        });
      } catch (e) {
        console.error('stellar_usdc initiateUserFunding submit:', e);
        if (isSpendRailError(e)) {
          return errSpendRail(e);
        }
        return errSpendRail(spendRailErrorNetworkUnavailable());
      }

      if (sub.kind === 'error') {
        return errSpendRail(sub.error);
      }
      if (sub.kind === 'confirmed') {
        return okSpendRail({
          status: 'confirmed',
          txReference: sub.txHash,
        });
      }
      return okSpendRail({
        status: 'submitted',
        txReference: sub.txHash,
      });
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<SpendPaymentPrepareRailValue>> {
      const sessionId = ctx.spendSessionId?.trim();
      if (!sessionId) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const fromRaw = ctx.railUserWalletAddress?.trim() ?? '';
      const fromOk = stellarWalletAddressSchema.safeParse(fromRaw);
      if (!fromOk.success) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }
      const receivingRaw = getSpendReceivingWalletAddress(spendRail).trim();
      const recvOk = stellarWalletAddressSchema.safeParse(receivingRaw);
      if (!recvOk.success) {
        return errSpendRail(spendRailErrorInvalidReceivingWallet());
      }
      const usdcIssuer = getStellarSpendUsdcIssuer();
      if (!usdcIssuer) {
        return errSpendRail(spendRailErrorInvalidReceivingWallet());
      }
      const usdcCode = getStellarSpendUsdcAssetCode();

      const amt = ctx.usdcAmount;
      const payLabel = `Pay ${amt.toFixed(2)} USDC on Stellar`;
      const preparedAction: SpendStellarUsdcBackendSubmitPreparedActionV1 = {
        v: 1,
        spend_rail: 'stellar_usdc',
        payment_channel: 'backend_submit',
        confirm: {
          method: 'POST',
          path: `/api/spend-sessions/${encodeURIComponent(sessionId)}/payment/confirm`,
          session_id: sessionId,
        },
        display: {
          pay_label: payLabel,
          submitting_label: 'Submitting your Stellar payment…',
        },
      };
      const verificationSnapshot = {
        v: 1 as const,
        spend_rail: 'stellar_usdc' as const,
        from_wallet: fromOk.data,
        receiving_wallet: recvOk.data,
        usdc_amount: amt,
        usdc_asset_code: usdcCode,
        usdc_issuer: usdcIssuer,
      };
      return okSpendRail({
        status: 'prepared',
        stellarUsdc: { preparedAction, verificationSnapshot },
      });
    },

    async confirmPayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<SpendPaymentConfirmRailValue>> {
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const privyUserId = ctx.sessionOwnerPrivyUserId?.trim();
      if (!privyUserId) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const fromRaw = ctx.railUserWalletAddress?.trim() ?? '';
      const fromOk = stellarWalletAddressSchema.safeParse(fromRaw);
      if (!fromOk.success) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }
      const receivingRaw = getSpendReceivingWalletAddress(spendRail).trim();
      const recvOk = stellarWalletAddressSchema.safeParse(receivingRaw);
      if (!recvOk.success) {
        return errSpendRail(spendRailErrorInvalidReceivingWallet());
      }

      let walletId: string;
      try {
        walletId = await resolveStellarPrivyWalletIdForUser(
          privyUserId,
          fromOk.data
        );
      } catch (e) {
        console.error('stellar_usdc confirmPayment wallet id:', e);
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }

      const sub = await submitSponsoredStellarUsdcPaymentFromUser({
        userPublicKey: fromOk.data,
        privyStellarWalletId: walletId,
        destinationPublicKey: recvOk.data,
        usdcAmount: ctx.usdcAmount,
      });

      if (!sub.ok) {
        console.error('stellar_usdc payment submit:', sub.internalMessage);
        return errSpendRail(classifyStellarPaymentSubmitReason(sub.reason));
      }

      return okSpendRail({
        status: 'submitted',
        ledgerTxReference: sub.txHash,
      });
    },

    explorerUrlForLedgerTx(
      txReference: string | null | undefined
    ): string | null {
      return spendPaymentRailExplorerUrl(spendRail, txReference);
    },

    async reconcilePendingOperations(
      ctx: SpendPaymentRailReconcileContext
    ): Promise<SpendRailResult<void>> {
      const { reconcileSpendRailPendingOperationsFromRailContext } =
        await import('@/lib/spend/reconcile-spend-rail-pending-operations');
      return reconcileSpendRailPendingOperationsFromRailContext(ctx, spendRail);
    },

    assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void> {
      return unsupported();
    },
  };
}
