import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import { recipientUsdcAddressForSpendTransfer } from '@/lib/spend/recipient-usdc-for-treasury-transfer';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
  encodeUsdcTransferData,
  POSTER_CHECKOUT_CHAIN_ID,
} from '@/lib/walletconnect-poster-direct-usdc';
import { verifySpendUsdcPaymentTx } from '@/lib/spend-payment-verify';
import { isLedgerCanonicalEvmTxHash } from '@/lib/spend-ledger-explorer-url';
import {
  getSpendBaseTreasuryPrivyTransferConfig,
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
  getSpendReceivingWalletAddress,
  getSpendTreasuryWalletAddress,
} from '@/lib/spend-rail-config';
import {
  spendRailErrorFundingFailed,
  spendRailErrorInvalidReceivingWallet,
  spendRailErrorNetworkUnavailable,
  spendRailErrorPaymentFailed,
  spendRailErrorTreasuryInsufficientFunds,
  spendRailErrorWalletReadinessFailed,
  spendRailErrorWalletUnavailable,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import {
  errSpendRail,
  okSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentPrepareRailValue,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';
import {
  spendPilotRailMixpanelFields,
  spendPilotSanitizedRailErrorFields,
} from '@/lib/analytics/spend-pilot-rail-context';
import {
  trackSpendWalletReadinessCompleted,
  trackSpendWalletReadinessFailed,
  trackSpendWalletReadinessStarted,
} from '@/lib/analytics/server';
import type {
  SpendPaymentRailReconcileContext,
  SpendPaymentRailSessionContext,
  SpendRailFundingOperationStatus,
  SpendRailPaymentOperationStatus,
} from '@/lib/spend/payment-rails/types';

function classifyTreasurySubmitFailure(message: string): SpendRailError {
  const m = message.toLowerCase();
  if (
    m.includes('insufficient') &&
    (m.includes('balance') || m.includes('funds')) &&
    !m.includes('gas') &&
    !m.includes('native')
  ) {
    return spendRailErrorTreasuryInsufficientFunds();
  }
  if (m.includes('wallet address mismatch') || m.includes('privy wallet')) {
    return spendRailErrorWalletReadinessFailed();
  }
  if (m.includes('rpc not configured') || m.includes('network unavailable')) {
    return spendRailErrorNetworkUnavailable();
  }
  return spendRailErrorFundingFailed();
}

function classifyPaymentVerifyFailure(reason: string): SpendRailError {
  const r = reason.toLowerCase();
  if (r.includes('rpc not configured') || r.includes('receipt wait')) {
    return spendRailErrorNetworkUnavailable();
  }
  return spendRailErrorPaymentFailed();
}

function isValidPositiveUsdcAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function embeddedEvmFromContext(
  ctx: SpendPaymentRailSessionContext
): SpendRailResult<string> {
  const embedded = ctx.embeddedEvmWalletAddress?.trim() ?? '';
  if (!embedded || !isEvmAddress(embedded)) {
    return errSpendRail(spendRailErrorWalletUnavailable());
  }
  return okSpendRail(embedded);
}

function treasuryTransferConfigFromContext(
  ctx: SpendPaymentRailSessionContext
): ReturnType<typeof getSpendBaseTreasuryPrivyTransferConfig> {
  const walletId = ctx.treasuryFundingWalletId?.trim();
  const address = ctx.treasuryFundingWalletAddress?.trim();
  if (walletId && address && isEvmAddress(address)) {
    return { walletId, address: address as `0x${string}` };
  }
  return getSpendBaseTreasuryPrivyTransferConfig();
}

export function createBaseUsdcSpendPaymentRail(): SpendPaymentRail {
  const spendRail: SpendRail = 'base_usdc';

  return {
    spendRail,

    async getTreasurySpendableBalance(): Promise<
      SpendRailResult<number | null>
    > {
      const treasury = getSpendTreasuryWalletAddress(spendRail).trim();
      if (!treasury || !isEvmAddress(treasury)) {
        return okSpendRail(null);
      }
      try {
        const bal = await fetchUsdcBalanceOnBase(treasury as `0x${string}`, {
          rpcUrl: getSpendRailBaseRpcUrl(),
          usdcContract: getSpendRailBaseUsdcContractAddress(),
        });
        return okSpendRail(bal);
      } catch (e) {
        console.error('base_usdc rail getTreasurySpendableBalance:', e);
        return okSpendRail(null);
      }
    },

    async runWalletReadinessOrchestration(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendWalletReadinessStatus }>> {
      /**
       * IRL-23: Base wallet “readiness” is synchronous validation only (no
       * `spend_wallet_readiness_operations` row). Mixpanel started/completed/failed
       * mirror that validation gate for funnel parity with Stellar.
       */
      const distinctId = ctx.analyticsDistinctId?.trim();
      const railFields = spendPilotRailMixpanelFields(spendRail);
      const walletReadinessBase = () => ({
        spend_session_id: ctx.spendSessionId?.trim() ?? '',
        spend_experience_id: ctx.spendExperienceId,
        point_conversion_id: ctx.pointConversionId,
        user_id: ctx.sessionOwnerPrivyUserId,
        wallet_address: (
          ctx.privyNormalizedWalletAddressLower ??
          ctx.embeddedEvmWalletAddress ??
          ''
        )
          .trim()
          .toLowerCase(),
        wallet_readiness_mode: 'base_validation_sync' as const,
        ...railFields,
      });

      if (distinctId && ctx.spendSessionId?.trim()) {
        trackSpendWalletReadinessStarted(distinctId, walletReadinessBase());
      }

      if (!ctx.spendSessionId?.trim()) {
        const err = spendRailErrorWalletReadinessFailed();
        if (distinctId) {
          trackSpendWalletReadinessFailed(distinctId, {
            ...walletReadinessBase(),
            ...spendPilotSanitizedRailErrorFields(err),
          });
        }
        return errSpendRail(err);
      }
      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        if (distinctId) {
          trackSpendWalletReadinessFailed(distinctId, {
            ...walletReadinessBase(),
            ...spendPilotSanitizedRailErrorFields(embeddedRes.error),
          });
        }
        return embeddedRes;
      }
      const embedded = embeddedRes.value;
      const authLower = ctx.privyNormalizedWalletAddressLower?.trim();
      if (authLower && embedded.toLowerCase() !== authLower.toLowerCase()) {
        const err = spendRailErrorWalletUnavailable();
        if (distinctId) {
          trackSpendWalletReadinessFailed(distinctId, {
            ...walletReadinessBase(),
            ...spendPilotSanitizedRailErrorFields(err),
          });
        }
        return errSpendRail(err);
      }
      if (distinctId) {
        trackSpendWalletReadinessCompleted(distinctId, walletReadinessBase());
      }
      return okSpendRail({ status: 'completed' });
    },

    async initiateUserFunding(ctx: SpendPaymentRailSessionContext): Promise<
      SpendRailResult<{
        status: SpendRailFundingOperationStatus;
        txReference?: string | null;
      }>
    > {
      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        return embeddedRes;
      }
      const embedded = embeddedRes.value;
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorFundingFailed());
      }
      const usdcAmount = ctx.usdcAmount;

      const transferCfg = treasuryTransferConfigFromContext(ctx);
      if (!transferCfg) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const serverLower = transferCfg.address.trim().toLowerCase();
      const sessionLower = embedded.toLowerCase();
      let normalizedWalletLower: string;
      if (serverLower === sessionLower) {
        const fromPrivy = ctx.privyNormalizedWalletAddressLower?.trim();
        if (!fromPrivy || !isEvmAddress(fromPrivy)) {
          return errSpendRail(spendRailErrorWalletUnavailable());
        }
        normalizedWalletLower = fromPrivy.toLowerCase();
        if (normalizedWalletLower === sessionLower) {
          return errSpendRail(spendRailErrorWalletUnavailable());
        }
      } else {
        normalizedWalletLower =
          ctx.privyNormalizedWalletAddressLower?.trim().toLowerCase() ??
          sessionLower;
      }

      const recipient = recipientUsdcAddressForSpendTransfer({
        serverWalletAddress: transferCfg.address,
        sessionWalletTrimmed: embedded,
        normalizedWalletLower,
      });

      const { submitTreasuryUsdcTransfer, getTreasuryTxReceiptStatus } =
        await import('@/lib/spend-treasury-usdc-transfer');

      const sub = await submitTreasuryUsdcTransfer({
        serverWalletId: transferCfg.walletId,
        serverWalletAddress: transferCfg.address,
        recipientAddress: recipient,
        usdcAmount,
        referenceId: ctx.fundingReferenceId?.trim() || undefined,
      });

      if (!sub.ok) {
        return errSpendRail(classifyTreasurySubmitFailure(sub.error));
      }

      if ('submittedPending' in sub && sub.submittedPending) {
        return okSpendRail({
          status: 'pending',
          txReference: `pending:${sub.privyTransactionId}`,
        });
      }

      if (!('txHash' in sub)) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const receipt = await getTreasuryTxReceiptStatus(sub.txHash);
      if (receipt === 'success') {
        return okSpendRail({
          status: 'confirmed',
          txReference: sub.txHash,
        });
      }
      if (receipt === 'reverted') {
        return errSpendRail(spendRailErrorFundingFailed());
      }
      return okSpendRail({
        status: 'submitted',
        txReference: sub.txHash,
      });
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<SpendPaymentPrepareRailValue>> {
      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        return embeddedRes;
      }
      const embedded = embeddedRes.value;
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const usdcAmount = ctx.usdcAmount;

      const receiving = getSpendReceivingWalletAddress(spendRail).trim();
      if (!receiving || !isEvmAddress(receiving)) {
        return errSpendRail(spendRailErrorInvalidReceivingWallet());
      }

      const usdcContract = getSpendRailBaseUsdcContractAddress();
      const recipient = receiving as `0x${string}`;
      const data = encodeUsdcTransferData(recipient, usdcAmount);
      const gas = 100000n;
      const evmTransactionRequest = {
        chainId: POSTER_CHECKOUT_CHAIN_ID,
        to: usdcContract.toLowerCase(),
        data,
        gas: gas.toString(),
      };
      const preparedAction = {
        v: 1 as const,
        spend_rail: 'base_usdc' as const,
        evmTransactionRequest,
      };
      const verificationSnapshot = {
        v: 1 as const,
        spend_rail: 'base_usdc' as const,
        chain_id: POSTER_CHECKOUT_CHAIN_ID,
        usdc_contract: usdcContract.toLowerCase(),
        receiving_wallet: receiving.toLowerCase(),
        from_wallet: embedded.toLowerCase(),
        usdc_amount: usdcAmount,
        transfer_calldata: data,
      };
      return okSpendRail({
        status: 'prepared',
        baseUsdc: { preparedAction, verificationSnapshot },
      });
    },

    async confirmPayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      const rawHash = ctx.paymentTxHash?.trim() ?? '';
      if (!rawHash || !isLedgerCanonicalEvmTxHash(rawHash)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const txHash = rawHash as `0x${string}`;

      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        return embeddedRes;
      }
      const embedded = embeddedRes.value;

      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const usdcAmount = ctx.usdcAmount;

      const receiving = getSpendReceivingWalletAddress(spendRail).trim();
      if (!receiving || !isEvmAddress(receiving)) {
        return errSpendRail(spendRailErrorInvalidReceivingWallet());
      }

      const verify = await verifySpendUsdcPaymentTx({
        txHash,
        expectedFrom: embedded as `0x${string}`,
        expectedTo: receiving as `0x${string}`,
        expectedUsdcAmount: usdcAmount,
      });

      if (!verify.ok) {
        return errSpendRail(classifyPaymentVerifyFailure(verify.reason));
      }

      return okSpendRail({ status: 'confirmed' });
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
      return okSpendRail(undefined);
    },
  };
}
