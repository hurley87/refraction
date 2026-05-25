import { NextRequest } from 'next/server';
import {
  createSpendExperience,
  getSpendExperienceByCreateIdempotencyKey,
  listSpendExperiences,
} from '@/lib/db/spend-experiences';
import { createSpendExperienceRequestSchema } from '@/lib/schemas/spend-experience';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { createSpendPrivyServerWallet } from '@/lib/api/privy';
import {
  SPEND_SERVER_WALLET_CHAIN,
  spendServerWalletFundingMetadata,
} from '@/lib/spend-server-wallet';
import {
  getSpendRailOperationalDiagnostics,
  getSpendRailPublicMetadata,
  assertSpendRailAllowsMutatingSpendWork,
} from '@/lib/spend-rail-config';
import { trackSpendPilotRailMutationBlocked } from '@/lib/analytics/server';
import { spendPilotRailMixpanelFields } from '@/lib/analytics/spend-pilot-rail-context';
import { adminCreateIdempotencyKey } from '@/lib/api/idempotency';

/** GET /api/admin/spend-experiences */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const spendExperiences = await listSpendExperiences();
    return apiSuccess({ spendExperiences });
  } catch (error) {
    console.error('Error listing spend experiences:', error);
    return apiError('Failed to fetch spend experiences', 500);
  }
}

/** POST /api/admin/spend-experiences */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();
    const validation = createSpendExperienceRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const idempotencyKey = adminCreateIdempotencyKey(request);
    if (!idempotencyKey) {
      return apiError('Missing idempotency key', 400);
    }

    const existing =
      await getSpendExperienceByCreateIdempotencyKey(idempotencyKey);
    if (existing) {
      return apiSuccess(
        {
          spendExperience: existing,
          funding: spendServerWalletFundingMetadata(existing, null),
        },
        'Spend experience already created'
      );
    }

    const spendRail = validation.data.spend_rail;
    const railGate = assertSpendRailAllowsMutatingSpendWork(spendRail);
    if (!railGate.ok) {
      trackSpendPilotRailMutationBlocked(
        adminCheck.user?.email ?? 'admin_server',
        {
          mutation: 'admin_spend_experience_create',
          ...railGate.analytics,
          ...spendPilotRailMixpanelFields(spendRail),
          admin_actor: adminCheck.user?.email ?? null,
        }
      );
      const meta = getSpendRailPublicMetadata(spendRail);
      const { unavailableReasons } =
        getSpendRailOperationalDiagnostics(spendRail);
      const detail =
        unavailableReasons.length > 0
          ? unavailableReasons.join('; ')
          : 'Check environment configuration for this rail.';
      return apiError(
        `${meta.displayName} is not available for new experiences. ${detail}`,
        400
      );
    }

    const wallet = await createSpendPrivyServerWallet({ idempotencyKey });
    const adminEmail = adminCheck.user?.email || undefined;
    const spendExperience = await createSpendExperience({
      ...validation.data,
      status: 'draft',
      privy_server_wallet_id: wallet.privy_server_wallet_id,
      server_wallet_address: wallet.server_wallet_address,
      server_wallet_chain: SPEND_SERVER_WALLET_CHAIN,
      server_wallet_created_at: wallet.server_wallet_created_at,
      spend_create_idempotency_key: idempotencyKey,
      created_by: adminEmail ?? null,
    });

    return apiSuccess(
      {
        spendExperience,
        funding: spendServerWalletFundingMetadata(spendExperience, null),
      },
      'Spend experience created successfully'
    );
  } catch (error) {
    console.error('Error creating spend experience:', error);
    const message =
      error instanceof Error && error.message.includes('Privy')
        ? error.message
        : 'Failed to create spend experience';
    return apiError(message, 500);
  }
}
