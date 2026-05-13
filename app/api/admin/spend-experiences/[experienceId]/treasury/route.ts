import { NextRequest } from 'next/server';
import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { listTreasuryTransactionsForExperience } from '@/lib/db/treasury-transactions';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import type { TreasuryTransaction } from '@/lib/types';
import {
  fetchServerWalletUsdcBalanceSafe,
  getSpendServerWalletTransferConfig,
  spendServerWalletFundingMetadata,
} from '@/lib/spend-server-wallet';
import {
  getSpendReceivingWalletAddress,
  getSpendTreasuryWalletAddress,
} from '@/lib/spend-rail-config';

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
 * Live treasury USDC balance, optional ledger, and funding metadata (PRD §12).
 * For Base USDC, the funding wallet is the experience server wallet when configured, otherwise env rail treasury.
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

    const rail = experience.spend_rail;
    const baseWalletCfg =
      rail === 'base_usdc'
        ? getSpendServerWalletTransferConfig(experience)
        : null;
    const treasuryWalletAddress =
      baseWalletCfg?.address ?? getSpendTreasuryWalletAddress(rail).trim();
    const receivingWalletAddress = getSpendReceivingWalletAddress(rail).trim();

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
      spendRail: rail,
      serverWalletAddress: treasuryWalletAddress,
      privyServerWalletId: baseWalletCfg?.walletId ?? null,
      serverWalletChain: rail === 'base_usdc' ? funding.chain : null,
      serverWalletCreatedAt:
        rail === 'base_usdc' ? experience.server_wallet_created_at : null,
      serverWalletUsdcBalance,
      funding,
      treasuryWalletAddress,
      receivingWalletAddress,
      treasuryUsdcBalance: serverWalletUsdcBalance,
      ledger,
      ledgerTotals,
    });
  } catch (error) {
    console.error('admin spend treasury:', error);
    return apiError('Failed to load treasury', 500);
  }
}
