import { NextRequest } from 'next/server';
import {
  adminResetActivationSettlementForRetryAtomic,
  getActivationSettlementTransactionById,
} from '@/lib/db/activation-settlement-transactions';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: { activationId: string; settlementId: string };
}

/** POST /api/admin/sponsored-activations/{activationId}/settlements/{settlementId}/retry */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const activationId = params.activationId?.trim();
    const settlementId = params.settlementId?.trim();
    if (!activationId || !settlementId) {
      return apiError('Missing activation or settlement id', 400);
    }

    const settlement =
      await getActivationSettlementTransactionById(settlementId);
    if (!settlement || settlement.activation_id !== activationId) {
      return apiError('Settlement not found', 404);
    }

    await adminResetActivationSettlementForRetryAtomic({
      settlementId,
      activationId,
    });

    return apiSuccess({ ok: true, settlementId });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('SETTLEMENT_NOT_ELIGIBLE_FOR_RETRY')) {
      return apiError('Settlement cannot be retried in its current state', 400);
    }
    console.error(
      'POST /api/admin/sponsored-activations/[activationId]/settlements/[settlementId]/retry:',
      error
    );
    return apiError('Failed to reset settlement for retry', 500);
  }
}
