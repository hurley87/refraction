import { NextRequest } from 'next/server';
import {
  TransactionNotFoundError,
  WaitForTransactionReceiptTimeoutError,
} from 'viem';
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
  findRecentTreasuryUsdcTransfer,
  submitTreasuryUsdcTransfer,
  waitForTreasuryTxReceipt,
} from '@/lib/spend-treasury-usdc-transfer';

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

    const submit = await submitTreasuryUsdcTransfer({
      serverWalletId: walletConfig.walletId,
      serverWalletAddress: walletConfig.address,
      recipientAddress: destinationAddress as `0x${string}`,
      usdcAmount: withdrawAmount,
    });

    if (!submit.ok) {
      return apiError(submit.error || 'USDC transfer failed', 500);
    }

    const destHex = destinationAddress as `0x${string}`;
    const serverHex = walletConfig.address;
    let confirmedTxHash = submit.txHash;

    const isLikelyIndexingLag = (err: unknown) =>
      err instanceof TransactionNotFoundError ||
      err instanceof WaitForTransactionReceiptTimeoutError ||
      (err instanceof Error && /could not be found/i.test(err.message));

    try {
      await waitForTreasuryTxReceipt(confirmedTxHash);
    } catch (waitErr) {
      if (!isLikelyIndexingLag(waitErr)) {
        const msg =
          waitErr instanceof Error ? waitErr.message : 'Confirmation failed';
        console.error('treasury withdraw waitForReceipt:', waitErr);
        return apiError(
          `${msg}. Transaction was submitted: ${confirmedTxHash}`,
          500
        );
      }

      console.warn(
        'treasury withdraw: receipt wait failed (possible RPC lag), resolving via logs:',
        waitErr
      );

      const logResolveDeadline = Date.now() + 120_000;
      let fromLogs: `0x${string}` | null = null;
      while (Date.now() < logResolveDeadline) {
        fromLogs = await findRecentTreasuryUsdcTransfer({
          serverWalletAddress: serverHex,
          recipientAddress: destHex,
          usdcAmount: withdrawAmount,
        });
        if (fromLogs) break;
        await new Promise((r) => setTimeout(r, 2_000));
      }

      if (!fromLogs) {
        const msg =
          waitErr instanceof Error ? waitErr.message : 'Confirmation failed';
        console.error(
          'treasury withdraw waitForReceipt (no log match):',
          waitErr
        );
        return apiError(
          `${msg}. Transaction was submitted: ${confirmedTxHash}`,
          500
        );
      }

      confirmedTxHash = fromLogs;
      try {
        await waitForTreasuryTxReceipt(confirmedTxHash);
      } catch (finalErr) {
        const msg =
          finalErr instanceof Error ? finalErr.message : 'Confirmation failed';
        console.error(
          'treasury withdraw waitForReceipt (after log resolve):',
          finalErr
        );
        return apiError(
          `${msg}. Transaction was submitted: ${confirmedTxHash}`,
          500
        );
      }
    }

    await insertTreasuryAdminRecoveryLedgerIfAbsent({
      spendExperienceId: experience.id,
      amount: withdrawAmount,
      fromWalletAddress: walletConfig.address,
      toWalletAddress: destinationAddress,
      txHash: confirmedTxHash,
    });

    return apiSuccess(
      {
        txHash: confirmedTxHash,
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
