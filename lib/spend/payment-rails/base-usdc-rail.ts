import type { SpendRail, SpendWalletReadinessStatus } from '@/lib/types';
import { recipientUsdcAddressForSpendTransfer } from '@/lib/spend/recipient-usdc-for-treasury-transfer';
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
      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        return embeddedRes;
      }
      const embedded = embeddedRes.value;
      const authLower = ctx.privyNormalizedWalletAddressLower?.trim();
      if (authLower && embedded.toLowerCase() !== authLower.toLowerCase()) {
        return errSpendRail(spendRailErrorWalletUnavailable());
      }
      return okSpendRail({ status: 'completed' });
    },

    async initiateUserFunding(
      ctx: SpendPaymentRailSessionContext
    ): Promise<SpendRailResult<{ status: SpendRailFundingOperationStatus }>> {
      const embeddedRes = embeddedEvmFromContext(ctx);
      if (!embeddedRes.ok) {
        return embeddedRes;
      }
      const embedded = embeddedRes.value;
      if (!isValidPositiveUsdcAmount(ctx.usdcAmount)) {
        return errSpendRail(spendRailErrorFundingFailed());
      }
      const usdcAmount = ctx.usdcAmount;

      const transferCfg = getSpendBaseTreasuryPrivyTransferConfig();
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
      void ctx;
      return okSpendRail(undefined);
    },

    assertUserSignedOnchainPaymentConfirmSupported(): SpendRailResult<void> {
      return okSpendRail(undefined);
    },
  };
}
