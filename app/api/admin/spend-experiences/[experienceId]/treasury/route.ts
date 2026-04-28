import { NextRequest } from 'next/server';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { fetchTreasuryUsdcBalanceSafe } from '@/lib/spend-conversion-preview';
import { listTreasuryTransactionsForExperience } from '@/lib/db/treasury-transactions';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import type { TreasuryTransaction } from '@/lib/types';

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
 * Treasury + receiving addresses, live USDC balance, optional ledger (PRD §12).
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

    const treasuryWalletAddress = experience.treasury_wallet_address.trim();
    const receivingWalletAddress = experience.receiving_wallet_address.trim();

    const [treasuryUsdcBalance, ledger] = await Promise.all([
      fetchTreasuryUsdcBalanceSafe(treasuryWalletAddress),
      listTreasuryTransactionsForExperience(experience.id),
    ]);

    const ledgerTotals = ledgerTotalsFromRows(ledger);

    return apiSuccess({
      spendExperienceId: experience.id,
      treasuryWalletAddress,
      receivingWalletAddress,
      treasuryUsdcBalance,
      ledger,
      ledgerTotals,
    });
  } catch (error) {
    console.error('admin spend treasury:', error);
    return apiError('Failed to load treasury', 500);
  }
}
