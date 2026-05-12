import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
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
  spendRailErrorRailOperationNotSupported,
  spendRailErrorTreasuryInsufficientFunds,
  spendRailErrorWalletReadinessFailed,
  spendRailErrorWalletUnavailable,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import {
  errSpendRail,
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
 * Treasury-funded USDC targets the session embedded wallet. If the session wallet equals the
 * treasury server wallet (misconfiguration), fall back to the authenticated user's normalized
 * embedded address — same rule as `lib/spend-conversion-confirm.ts`.
 */
function recipientUsdcAddressForTreasuryFunding(params: {
  serverWalletAddress: string;
  sessionWalletTrimmed: string;
  normalizedWalletLower: string;
}): `0x${string}` {
  const serverWalletLower = params.serverWalletAddress.trim().toLowerCase();
  const sessionLower = params.sessionWalletTrimmed.toLowerCase();
  if (serverWalletLower === sessionLower) {
    return params.normalizedWalletLower as `0x${string}`;
  }
  return params.sessionWalletTrimmed as `0x${string}`;
}

function normalizedEmbeddedLower(ctx: SpendPaymentRailSessionContext): string {
  const fromPrivy = ctx.privyNormalizedWalletAddressLower?.trim();
  if (fromPrivy) return fromPrivy.toLowerCase();
  const embedded = ctx.embeddedEvmWalletAddress?.trim();
  return embedded ? embedded.toLowerCase() : '';
}

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

/**
 * Base USDC rail: treasury balance, embedded-wallet readiness, Privy treasury funding,
 * on-chain payment verification against the configured global receiving wallet, and explorer URLs.
 */
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
      if (!ctx.spendSessionId?.trim()) {
        return errSpendRail(spendRailErrorWalletReadinessFailed());
      }
      const embedded = ctx.embeddedEvmWalletAddress?.trim() ?? '';
      if (!embedded || !isEvmAddress(embedded)) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }
      const authLower = ctx.privyNormalizedWalletAddressLower?.trim();
      if (authLower && embedded.toLowerCase() !== authLower.toLowerCase()) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }
      return okSpendRail({ status: 'completed' });
    },

    async initiateUserFunding(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailFundingOperationStatus }>> {
      const embedded = ctx.embeddedEvmWalletAddress?.trim() ?? '';
      if (!embedded || !isEvmAddress(embedded)) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }
      const usdcAmount = ctx.usdcAmount;
      if (
        usdcAmount == null ||
        !Number.isFinite(usdcAmount) ||
        usdcAmount <= 0
      ) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const transferCfg = getSpendBaseTreasuryPrivyTransferConfig();
      if (!transferCfg) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const normalizedLower = normalizedEmbeddedLower(ctx);
      if (!normalizedLower || !isEvmAddress(normalizedLower)) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }

      const recipient = recipientUsdcAddressForTreasuryFunding({
        serverWalletAddress: transferCfg.address,
        sessionWalletTrimmed: embedded,
        normalizedWalletLower: normalizedLower,
      });

      const { submitTreasuryUsdcTransfer, getTreasuryTxReceiptStatus } =
        await import('@/lib/spend-treasury-usdc-transfer');

      const sub = await submitTreasuryUsdcTransfer({
        serverWalletId: transferCfg.walletId,
        serverWalletAddress: transferCfg.address,
        recipientAddress: recipient,
        usdcAmount,
      });

      if (!sub.ok) {
        return errSpendRail(classifyTreasurySubmitFailure(sub.error));
      }

      if ('submittedPending' in sub && sub.submittedPending) {
        return okSpendRail({ status: 'pending' });
      }

      if (!('txHash' in sub)) {
        return errSpendRail(spendRailErrorFundingFailed());
      }

      const receipt = await getTreasuryTxReceiptStatus(sub.txHash);
      if (receipt === 'success') {
        return okSpendRail({ status: 'confirmed' });
      }
      if (receipt === 'reverted') {
        return errSpendRail(spendRailErrorFundingFailed());
      }
      return okSpendRail({ status: 'submitted' });
    },

    async preparePayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      void ctx;
      return errSpendRail(spendRailErrorRailOperationNotSupported());
    },

    async confirmPayment(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailPaymentOperationStatus }>> {
      const rawHash = ctx.paymentTxHash?.trim() ?? '';
      if (!rawHash || !isLedgerCanonicalEvmTxHash(rawHash)) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }
      const txHash = rawHash as `0x${string}`;

      const embedded = ctx.embeddedEvmWalletAddress?.trim() ?? '';
      if (!embedded || !isEvmAddress(embedded)) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }

      const usdcAmount = ctx.usdcAmount;
      if (
        usdcAmount == null ||
        !Number.isFinite(usdcAmount) ||
        usdcAmount <= 0
      ) {
        return errSpendRail(spendRailErrorPaymentFailed());
      }

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
      void ctx;
      return okSpendRail(undefined);
    },

    assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void> {
      return okSpendRail(undefined);
    },
  };
}
