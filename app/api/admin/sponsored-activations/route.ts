import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createSponsoredActivation,
  getSponsoredActivationByCreateIdempotencyKey,
  listSponsoredActivations,
} from '@/lib/db/sponsored-activations';
import {
  adminCreateSponsoredActivationRequestSchema,
  resolveAdminBaseSponsoredActivationAssetConfig,
  type AdminCreateSponsoredActivationRequest,
} from '@/lib/schemas/sponsored-activation';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { createSponsoredActivationPrivyCampaignWallet } from '@/lib/api/privy';
import { sameWalletAddress } from '@/lib/utils/wallets';
import { sponsoredActivationAdminEnvelope } from '@/lib/activation/explorer-url';
import { adminCreateIdempotencyKey } from '@/lib/api/idempotency';
import {
  getDefaultStellarSponsoredActivationUsdcAssetConfig,
  getStellarSponsoredCampaignPublicKey,
} from '@/lib/activation/stellar-campaign-wallet-config';
import { getDefaultTempoSponsoredActivationAssetConfig } from '@/lib/activation/tempo-config';
import {
  SolanaCaddConfigError,
  type SolanaCaddAssetConfig,
} from '@/lib/activation/solana-config';
import { resolveSolanaCaddSponsoredActivationAssetConfig } from '@/lib/activation/solana-cadd-asset-config';

function resolveAdminSponsoredActivationAssetConfig(
  data: AdminCreateSponsoredActivationRequest,
  solanaCaddAssetConfig: SolanaCaddAssetConfig | null
): Record<string, unknown> {
  switch (data.settlement_rail) {
    case 'base':
      return resolveAdminBaseSponsoredActivationAssetConfig(data.payment_token);
    case 'tempo':
      return getDefaultTempoSponsoredActivationAssetConfig();
    case 'solana':
      if (!solanaCaddAssetConfig) {
        throw new SolanaCaddConfigError('Solana CADD asset is not resolved');
      }
      return solanaCaddAssetConfig;
    case 'stellar':
      return getDefaultStellarSponsoredActivationUsdcAssetConfig();
  }
}

/** GET /api/admin/sponsored-activations */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const rows = await listSponsoredActivations();
    return apiSuccess({
      activations: rows.map((r) => sponsoredActivationAdminEnvelope(r)),
    });
  } catch (error) {
    console.error('GET /api/admin/sponsored-activations:', error);
    return apiError('Failed to list sponsored activations', 500);
  }
}

/** POST /api/admin/sponsored-activations */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const idempotencyKey = adminCreateIdempotencyKey(request);
    if (!idempotencyKey) {
      return apiError('Missing idempotency key', 400);
    }

    const existing =
      await getSponsoredActivationByCreateIdempotencyKey(idempotencyKey);
    if (existing) {
      return apiSuccess(
        {
          activation: sponsoredActivationAdminEnvelope(existing),
        },
        'Sponsored activation already created'
      );
    }

    const body = await request.json();
    const validation =
      adminCreateSponsoredActivationRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }
    const data = validation.data;

    let solanaCaddAssetConfig: SolanaCaddAssetConfig | null = null;
    if (data.settlement_rail === 'solana') {
      try {
        solanaCaddAssetConfig =
          await resolveSolanaCaddSponsoredActivationAssetConfig();
      } catch (e) {
        if (e instanceof SolanaCaddConfigError) return apiError(e.message, 500);
        throw e;
      }
      if (data.venue_settlement_wallet_address === solanaCaddAssetConfig.mint) {
        return apiValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message:
                'Venue settlement wallet must be a wallet, not the CADD mint',
              path: ['venue_settlement_wallet_address'],
            },
          ])
        );
      }
    }

    let campaign_wallet_address: string;
    let privy_campaign_wallet_id: string | null = null;

    if (data.settlement_rail === 'stellar') {
      try {
        campaign_wallet_address = getStellarSponsoredCampaignPublicKey();
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Stellar campaign wallet is not configured';
        return apiError(msg, 500);
      }
    } else {
      const wallet = await createSponsoredActivationPrivyCampaignWallet({
        idempotencyKey,
        settlementRail: data.settlement_rail,
      });
      campaign_wallet_address = wallet.campaign_wallet_address;
      privy_campaign_wallet_id = wallet.privy_campaign_wallet_id;
    }

    if (
      sameWalletAddress(
        campaign_wallet_address,
        data.venue_settlement_wallet_address
      )
    ) {
      return apiValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              data.settlement_rail === 'stellar'
                ? 'Venue settlement wallet must differ from the shared Stellar campaign wallet'
                : 'Provisioned campaign wallet must differ from venue_settlement_wallet_address',
            path: ['venue_settlement_wallet_address'],
          },
        ])
      );
    }

    const activationId = randomUUID();
    const usdc_asset_config = resolveAdminSponsoredActivationAssetConfig(
      data,
      solanaCaddAssetConfig
    );

    const description =
      data.description == null ? null : data.description.trim() || null;

    const row = await createSponsoredActivation({
      id: activationId,
      slug: activationId,
      title: data.title,
      description,
      sponsor_name: data.sponsor_name,
      event_id: data.event_id ?? null,
      status: 'draft',
      settlement_rail: data.settlement_rail,
      campaign_wallet_address,
      venue_settlement_wallet_address: data.venue_settlement_wallet_address,
      usdc_asset_config,
      max_redemptions: data.max_redemptions ?? null,
      max_usdc_budget: data.max_usdc_budget ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      eligibility_config: data.eligibility_config as Record<string, unknown>,
      created_by: data.created_by ?? adminCheck.user?.email ?? null,
      activation_create_idempotency_key: idempotencyKey,
      privy_campaign_wallet_id,
    });

    return apiSuccess(
      {
        activation: sponsoredActivationAdminEnvelope(row),
      },
      'Sponsored activation created successfully'
    );
  } catch (error) {
    console.error('POST /api/admin/sponsored-activations:', error);
    const message =
      error instanceof Error && error.message.toLowerCase().includes('privy')
        ? error.message
        : 'Failed to create sponsored activation';
    return apiError(message, 500);
  }
}
