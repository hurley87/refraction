import { NextRequest } from 'next/server';
import type { AdminSpendRailRow, SpendRail } from '@/lib/types';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import {
  getSpendRailOperationalDiagnostics,
  getSpendRailPublicMetadata,
  getSpendReceivingWalletAddress,
} from '@/lib/spend-rail-config';

const SPEND_RAILS: SpendRail[] = ['base_usdc', 'stellar_usdc'];

/** GET /api/admin/spend-rails — public-style rail labels plus receiving + operational diagnostics. */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const rails: AdminSpendRailRow[] = SPEND_RAILS.map((spend_rail) => {
      const meta = getSpendRailPublicMetadata(spend_rail);
      const diag = getSpendRailOperationalDiagnostics(spend_rail);
      return {
        spend_rail,
        displayName: meta.displayName,
        networkLabel: meta.networkLabel,
        assetSymbol: meta.assetSymbol,
        receivingWalletAddress: getSpendReceivingWalletAddress(spend_rail),
        operational: diag.operational,
        unavailableReasons: diag.unavailableReasons,
      };
    });

    return apiSuccess({ rails });
  } catch (error) {
    console.error('Error listing spend rails:', error);
    return apiError('Failed to load spend rails', 500);
  }
}
