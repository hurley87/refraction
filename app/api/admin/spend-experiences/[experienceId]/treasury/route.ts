import { NextRequest } from 'next/server';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { listTreasuryTransactionsForExperience } from '@/lib/db/treasury-transactions';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import type { TreasuryTransaction } from '@/lib/types';
import {
  fetchServerWalletUsdcBalanceSafe,
  getSpendServerWalletAddress,
  spendServerWalletFundingMetadata,
} from '@/lib/spend-server-wallet';

interface RouteParams {
  params: { experienceId: string };
}

function ledgerTotalsFromRows(rows: TreasuryTransaction[]): {
  fund_user_usdc: number;
  receive_payment_usdc: number;
  admin_recovery_usdc: number;
} {
  let fund_user_usdc = 0;
  let receive_payment_usdc = 0;
  let admin_recovery_usdc = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.amount)) continue;
    if (r.transaction_type === 'fund_user') fund_user_usdc += r.amount;
    else if (r.transaction_type === 'receive_payment')
      receive_payment_usdc += r.amount;
    else if (r.transaction_type === 'admin_recovery')
      admin_recovery_usdc += r.amount;
  }
  return { fund_user_usdc, receive_payment_usdc, admin_recovery_usdc };
}

/**
 * GET /api/admin/spend-experiences/{experienceId}/treasury
 * Server wallet address, live USDC balance, optional ledger (PRD §12).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(_request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const experience = await getSpendExperienceById(params.experienceId);
    if (!experience) {
      return apiError('Spend experience not found', 404);
    }

    const serverWalletAddress = getSpendServerWalletAddress(experience).trim();

    const [serverWalletUsdcBalance, ledger] = await Promise.all([
      fetchServerWalletUsdcBalanceSafe(experience),
      listTreasuryTransactionsForExperience(experience.id),
    ]);

    const ledgerTotals = ledgerTotalsFromRows(ledger);
    const funding = spendServerWalletFundingMetadata(
      experience,
      serverWalletUsdcBalance
    );

    return apiSuccess({
      spendExperienceId: experience.id,
      serverWalletAddress,
      privyServerWalletId: experience.privy_server_wallet_id,
      serverWalletChain: experience.server_wallet_chain,
      serverWalletCreatedAt: experience.server_wallet_created_at,
      serverWalletUsdcBalance,
      funding,
      treasuryWalletAddress: serverWalletAddress,
      receivingWalletAddress: serverWalletAddress,
      treasuryUsdcBalance: serverWalletUsdcBalance,
      ledger,
      ledgerTotals,
    });
  } catch (error) {
    console.error('admin spend treasury:', error);
    return apiError('Failed to load treasury', 500);
  }
}
