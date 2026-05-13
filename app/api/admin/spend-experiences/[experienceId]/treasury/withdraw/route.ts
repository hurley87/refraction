import { NextRequest } from 'next/server';
import { formatPrivyResponseForLog, getPrivyClient } from '@/lib/api/privy';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { insertTreasuryAdminRecoveryLedgerIfAbsent } from '@/lib/db/treasury-transactions';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { treasuryWithdrawRequestSchema } from '@/lib/schemas/treasury-withdraw';
import {
  fetchServerWalletUsdcBalanceSafe,
  getSpendServerWalletAddress,
  getSpendServerWalletTransferConfig,
} from '@/lib/spend-server-wallet';
import { assertSpendRailAllowsMutatingSpendWork } from '@/lib/spend-rail-config';
import { trackSpendPilotRailMutationBlocked } from '@/lib/analytics/server';
import { spendPilotRailMixpanelFields } from '@/lib/analytics/spend-pilot-rail-context';
import {
  submitTreasuryUsdcTransfer,
  waitForTreasuryTxReceipt,
} from '@/lib/spend-treasury-usdc-transfer';
import { SPEND_SERVER_WALLET_CAIP2 } from '@/lib/spend-server-wallet';

interface RouteParams {
  params: { experienceId: string };
}

/**
 * POST /api/admin/spend-experiences/{experienceId}/treasury/withdraw
 * Sends USDC from the experience server wallet to an admin-provided address on Base.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const experience = await getSpendExperienceById(params.experienceId);
    if (!experience) {
      return apiError('Spend experience not found', 404);
    }

    const railGate = assertSpendRailAllowsMutatingSpendWork(
      experience.spend_rail
    );
    if (!railGate.ok) {
      trackSpendPilotRailMutationBlocked(
        adminCheck.user?.email ?? 'admin_server',
        {
          mutation: 'admin_treasury_withdraw',
          ...railGate.analytics,
          ...spendPilotRailMixpanelFields(experience.spend_rail),
          spend_experience_id: experience.id,
          event_id: experience.event_id,
          admin_actor: adminCheck.user?.email ?? null,
        }
      );
      return apiError(railGate.error, 400);
    }

    if (experience.spend_rail !== 'base_usdc') {
      return apiError(
        'USDC withdrawals are only supported for Base USDC experiences.',
        400
      );
    }

    const walletConfig = getSpendServerWalletTransferConfig(experience);
    if (!walletConfig) {
      return apiError(
        'Server wallet is not configured for this experience.',
        400
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const validation = treasuryWithdrawRequestSchema.safeParse(raw);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const { destinationAddress, amountUsdc } = validation.data;
    const destLower = destinationAddress.toLowerCase();
    const serverLower = getSpendServerWalletAddress(experience)
      .trim()
      .toLowerCase();

    if (destLower === serverLower) {
      return apiError(
        'Destination must differ from the server wallet address.',
        400
      );
    }

    const balance = await fetchServerWalletUsdcBalanceSafe(experience);
    if (balance === null || Number.isNaN(balance)) {
      return apiError('Could not read server wallet USDC balance.', 500);
    }

    const maxMicro = Math.floor(balance * 1e6);
    let withdrawMicro: number;
    if (amountUsdc != null && amountUsdc > 0) {
      withdrawMicro = Math.floor(amountUsdc * 1e6);
      if (withdrawMicro <= 0) {
        return apiError('Withdraw amount must be positive.', 400);
      }
      if (withdrawMicro > maxMicro) {
        return apiError(
          `Amount exceeds available balance (${(maxMicro / 1e6).toFixed(6)} USDC).`,
          400
        );
      }
    } else {
      withdrawMicro = maxMicro;
    }

    if (withdrawMicro <= 0) {
      return apiError('No USDC available to withdraw.', 400);
    }

    const withdrawAmount = withdrawMicro / 1e6;

    try {
      const privy = getPrivyClient();
      const wallet = await privy.walletApi.getWallet({
        id: walletConfig.walletId,
      });
      console.info('treasury withdraw preflight_success', {
        step: 'preflight_success',
        walletId: walletConfig.walletId,
        walletAddress: wallet.address,
        caip2: SPEND_SERVER_WALLET_CAIP2,
        sponsor: true,
        privyWalletSummary: formatPrivyResponseForLog(wallet),
      });
    } catch (preflightErr) {
      console.error(
        'treasury withdraw Privy wallet preflight failed:',
        preflightErr
      );
      return apiError(
        'Could not load Privy server wallet for withdrawal. Check privy_server_wallet_id and credentials.',
        500
      );
    }

    const submit = await submitTreasuryUsdcTransfer({
      serverWalletId: walletConfig.walletId,
      serverWalletAddress: walletConfig.address,
      recipientAddress: destinationAddress as `0x${string}`,
      usdcAmount: withdrawAmount,
      withdrawTelemetry: true,
    });

    if (!submit.ok) {
      return apiError(submit.error || 'USDC transfer failed', 500);
    }

    if ('submittedPending' in submit && submit.submittedPending) {
      console.info('treasury withdraw submitted_pending_no_hash', {
        step: 'tx_hash_pending',
        privyTransactionId: submit.privyTransactionId,
        referenceId: submit.referenceId,
        userOperationHash: submit.userOperationHash,
        lastPrivyStatus: submit.lastPrivyStatus,
        privyResponseShape: submit.privySendSummary,
      });
      return apiSuccess(
        {
          status: 'submitted' as const,
          privyTransactionId: submit.privyTransactionId,
          amountUsdc: withdrawAmount,
          destinationAddress,
          userOperationHash: submit.userOperationHash,
          referenceId: submit.referenceId,
          lastPrivyStatus: submit.lastPrivyStatus,
          message:
            'Withdrawal was accepted by Privy; on-chain hash is not available yet. Re-check shortly or use the block explorer with this transaction id.',
        },
        'Withdrawal submitted; confirmation pending.',
        202
      );
    }

    if (!('txHash' in submit)) {
      return apiError('Unexpected treasury submit response.', 500);
    }

    const {
      txHash,
      privySendSummary,
      privyTransactionId,
      userOperationHash,
      referenceId,
      privyStatus,
    } = submit;

    console.info('withdraw_privy_send_success', {
      step: 'send_transaction_success',
      walletId: walletConfig.walletId,
      walletAddress: walletConfig.address,
      caip2: SPEND_SERVER_WALLET_CAIP2,
      sponsor: true,
      txHash,
      privyResponseShape: privySendSummary,
    });

    try {
      await waitForTreasuryTxReceipt(txHash);
      console.info('withdraw_confirmed', {
        txHash,
        privyTransactionId,
        userOperationHash,
        referenceId,
        privyStatus,
      });
    } catch (waitErr) {
      const msg =
        waitErr instanceof Error ? waitErr.message : 'Confirmation failed';
      console.warn('treasury withdraw receipt_wait_timeout_or_error', {
        step: 'receipt_wait_timeout_or_error',
        txHash,
        error: msg,
      });
      return apiSuccess(
        {
          status: 'submitted' as const,
          txHash,
          privyTransactionId,
          userOperationHash,
          referenceId,
          amountUsdc: withdrawAmount,
          destinationAddress,
          message:
            'Withdrawal was included on-chain; full receipt confirmation is still pending or timed out. Check the block explorer for this transaction hash.',
        },
        'Withdrawal submitted; confirmation pending.',
        202
      );
    }

    console.info('treasury withdraw ledger_insert_attempted', {
      step: 'ledger_insert_attempted',
      txHash,
    });
    await insertTreasuryAdminRecoveryLedgerIfAbsent({
      spendExperienceId: experience.id,
      spendRail: experience.spend_rail,
      amount: withdrawAmount,
      fromWalletAddress: walletConfig.address,
      toWalletAddress: destinationAddress,
      txHash,
    });

    return apiSuccess(
      {
        status: 'confirmed' as const,
        txHash,
        privyTransactionId,
        userOperationHash,
        referenceId,
        amountUsdc: withdrawAmount,
        destinationAddress,
      },
      'Withdrawal confirmed.'
    );
  } catch (error) {
    console.error('admin treasury withdraw:', error);
    return apiError('Failed to withdraw USDC', 500);
  }
}
