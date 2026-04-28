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
import { spendServerWalletAddress } from '@/lib/spend-server-wallet';

const DEFAULT_SPEND_WALLET_CHAIN = 'base-mainnet';

function createIdempotencyKey(request: NextRequest): string {
  return (
    request.headers.get('idempotency-key') ??
    request.headers.get('x-idempotency-key') ??
    crypto.randomUUID()
  ).trim();
}

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

    const idempotencyKey = createIdempotencyKey(request);
    if (!idempotencyKey) {
      return apiError('Missing idempotency key', 400);
    }

    const existing =
      await getSpendExperienceByCreateIdempotencyKey(idempotencyKey);
    if (existing) {
      return apiSuccess(
        {
          spendExperience: existing,
          funding: {
            serverWalletAddress: spendServerWalletAddress(existing),
            chain: existing.server_wallet_chain,
            minimumUsdc: existing.max_usdc_per_user,
            usdcBalance: null,
            funded: false,
          },
        },
        'Spend experience already created'
      );
    }

    const wallet = await createSpendPrivyServerWallet({ idempotencyKey });
    const adminEmail = adminCheck.user?.email || undefined;
    const spendExperience = await createSpendExperience({
      ...validation.data,
      status: 'draft',
      privy_server_wallet_id: wallet.privy_server_wallet_id,
      server_wallet_address: wallet.server_wallet_address,
      server_wallet_chain: DEFAULT_SPEND_WALLET_CHAIN,
      server_wallet_created_at: wallet.server_wallet_created_at,
      spend_create_idempotency_key: idempotencyKey,
      created_by: adminEmail ?? null,
    });

    return apiSuccess(
      {
        spendExperience,
        funding: {
          serverWalletAddress: wallet.server_wallet_address,
          chain: DEFAULT_SPEND_WALLET_CHAIN,
          minimumUsdc: spendExperience.max_usdc_per_user,
          usdcBalance: null,
          funded: false,
        },
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
