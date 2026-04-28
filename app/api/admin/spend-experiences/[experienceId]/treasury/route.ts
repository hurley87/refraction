import { NextRequest } from 'next/server';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { fetchTreasuryUsdcBalanceSafe } from '@/lib/spend-conversion-preview';
import { listTreasuryTransactionsForExperience } from '@/lib/db/treasury-transactions';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { experienceId: string };
}

function sumLedgerAmount(
  rows: { transaction_type: string; amount: number }[],
  type: string
): number {
  let s = 0;
  for (const r of rows) {
    if (r.transaction_type === type && Number.isFinite(r.amount)) {
      s += r.amount;
    }
  }
  return s;
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

    return apiSuccess({
      spendExperienceId: experience.id,
      treasuryWalletAddress,
      receivingWalletAddress,
      treasuryUsdcBalance,
      ledger,
      ledgerTotals: {
        fund_user_usdc: sumLedgerAmount(ledger, 'fund_user'),
        receive_payment_usdc: sumLedgerAmount(ledger, 'receive_payment'),
        admin_recovery_usdc: sumLedgerAmount(ledger, 'admin_recovery'),
      },
    });
  } catch (error) {
    console.error('admin spend treasury:', error);
    return apiError('Failed to load treasury', 500);
  }
}
