import { NextRequest } from 'next/server';
import { withdrawSponsoredActivationCampaignWallet } from '@/lib/activation/campaign-wallet-withdraw';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { getSponsoredActivationById } from '@/lib/db/sponsored-activations';
import { sponsoredActivationCampaignWithdrawRequestSchema } from '@/lib/schemas/sponsored-activation-withdraw';

interface RouteParams {
  params: { activationId: string };
}

/**
 * POST /api/admin/sponsored-activations/{activationId}/campaign-wallet/withdraw
 * Sends withdrawable USDC from the activation campaign wallet to an admin-provided address.
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

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const validation =
      sponsoredActivationCampaignWithdrawRequestSchema.safeParse(raw);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const result = await withdrawSponsoredActivationCampaignWallet({
      activation,
      destinationAddress: validation.data.destinationAddress,
      amountUsdc: validation.data.amountUsdc,
    });

    if (!result.ok) {
      return apiError(result.error, result.statusCode ?? 500);
    }

    const payload = {
      status: result.status,
      amountUsdc: result.amountUsdc,
      destinationAddress: result.destinationAddress,
      txHash: result.txHash,
      privyTransactionId: result.privyTransactionId,
      userOperationHash: result.userOperationHash,
      referenceId: result.referenceId,
      ...(result.status === 'submitted' ? { message: result.message } : {}),
    };

    return apiSuccess(
      payload,
      result.status === 'submitted' ? result.message : 'Withdrawal confirmed.',
      result.status === 'submitted' ? 202 : 200
    );
  } catch (error) {
    console.error(
      'POST /api/admin/sponsored-activations/[activationId]/campaign-wallet/withdraw:',
      error
    );
    return apiError('Failed to withdraw campaign wallet USDC', 500);
  }
}
