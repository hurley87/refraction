import { NextRequest } from 'next/server';
import { sendSponsoredActivationRemainingBalanceToVenue } from '@/lib/activation/campaign-wallet-send-to-venue';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { getSponsoredActivationById } from '@/lib/db/sponsored-activations';
import { formatSettlementExplorerTxUrl } from '@/lib/spend-rail-config';

interface RouteParams {
  params: { activationId: string };
}

/**
 * POST /api/admin/sponsored-activations/{activationId}/campaign-wallet/send-to-venue
 * Sends the campaign wallet's unreserved balance to the activation's venue settlement wallet.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const activation = await getSponsoredActivationById(params.activationId);
    if (!activation) {
      return apiError('Sponsored activation not found', 404);
    }

    const result = await sendSponsoredActivationRemainingBalanceToVenue({
      activation,
    });
    if (!result.ok) {
      return apiError(result.error, result.statusCode ?? 500);
    }

    const payload = {
      status: result.status,
      amountUsdc: result.amountUsdc,
      destinationAddress: result.destinationAddress,
      txHash: result.txHash ?? null,
      explorerTxUrl: formatSettlementExplorerTxUrl(
        activation.settlement_rail,
        result.txHash
      ),
      privyTransactionId: result.privyTransactionId,
      userOperationHash: result.userOperationHash,
      referenceId: result.referenceId,
      ...(result.status === 'submitted' ? { message: result.message } : {}),
    };

    return apiSuccess(
      payload,
      result.status === 'submitted'
        ? result.message
        : 'Remaining balance sent to the venue.',
      result.status === 'submitted' ? 202 : 200
    );
  } catch (error) {
    console.error(
      'POST /api/admin/sponsored-activations/[activationId]/campaign-wallet/send-to-venue:',
      error
    );
    return apiError('Failed to send remaining balance to the venue', 500);
  }
}
