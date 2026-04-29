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
      console.info('treasury withdraw Privy preflight', {
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
    });

    if (!submit.ok) {
      return apiError(submit.error || 'USDC transfer failed', 500);
    }

    console.info('treasury withdraw Privy sendTransaction result', {
      walletId: walletConfig.walletId,
      walletAddress: walletConfig.address,
      caip2: SPEND_SERVER_WALLET_CAIP2,
      sponsor: true,
      txHash: submit.txHash,
      privyResponseShape: submit.privySendSummary,
    });

    try {
      await waitForTreasuryTxReceipt(submit.txHash);
    } catch (waitErr) {
      const msg =
        waitErr instanceof Error ? waitErr.message : 'Confirmation failed';
      console.error('treasury withdraw waitForReceipt:', waitErr);
      return apiError(
        `${msg}. Transaction was submitted: ${submit.txHash}`,
        500
      );
    }

    await insertTreasuryAdminRecoveryLedgerIfAbsent({
      spendExperienceId: experience.id,
      amount: withdrawAmount,
      fromWalletAddress: walletConfig.address,
      toWalletAddress: destinationAddress,
      txHash: submit.txHash,
    });

    return apiSuccess(
      {
        txHash: submit.txHash,
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
