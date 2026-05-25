import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  countActivationRedemptions,
  countActiveRewardItemsForActivation,
  getSponsoredActivationById,
  updateSponsoredActivation,
} from '@/lib/db/sponsored-activations';
import {
  sponsoredActivationSettlementBundleSchema,
  updateSponsoredActivationSchema,
} from '@/lib/schemas/sponsored-activation';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { sponsoredActivationAdminEnvelope } from '@/lib/activation/explorer-url';

interface RouteParams {
  params: { activationId: string };
}

const IMMUTABLE_WALLET_PATCH_KEYS = [
  'settlement_rail',
  'campaign_wallet_address',
  'venue_settlement_wallet_address',
  'usdc_asset_config',
] as const;

function immutabilityViolationError() {
  return apiValidationError(
    new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message:
          'settlement_rail, campaign_wallet_address, venue_settlement_wallet_address, and usdc_asset_config are immutable unless status is draft with no activation_redemption rows',
        path: [],
      },
    ])
  );
}

function patchTouchesImmutableWalletFields(
  v: z.infer<typeof updateSponsoredActivationSchema>
): boolean {
  return IMMUTABLE_WALLET_PATCH_KEYS.some((key) => v[key] !== undefined);
}

/** GET /api/admin/sponsored-activations/{activationId} */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const row = await getSponsoredActivationById(params.activationId);
    if (!row) {
      return apiError('Sponsored activation not found', 404);
    }

    return apiSuccess({
      activation: sponsoredActivationAdminEnvelope(row),
    });
  } catch (error) {
    console.error(
      'GET /api/admin/sponsored-activations/[activationId]:',
      error
    );
    return apiError('Failed to load sponsored activation', 500);
  }
}

/** PATCH /api/admin/sponsored-activations/{activationId} */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const existing = await getSponsoredActivationById(params.activationId);
    if (!existing) {
      return apiError('Sponsored activation not found', 404);
    }

    const raw = await request.json();
    const validation = updateSponsoredActivationSchema.safeParse(raw);
    if (!validation.success) {
      return apiValidationError(validation.error);
    }
    const v = validation.data;

    const redemptionCount =
      existing.status === 'draft'
        ? await countActivationRedemptions(existing.id)
        : 0;
    const locked = existing.status !== 'draft' || redemptionCount > 0;

    if (locked && patchTouchesImmutableWalletFields(v)) {
      return immutabilityViolationError();
    }

    if (!locked && patchTouchesImmutableWalletFields(v)) {
      const merged = {
        settlement_rail: v.settlement_rail ?? existing.settlement_rail,
        campaign_wallet_address:
          v.campaign_wallet_address ?? existing.campaign_wallet_address,
        venue_settlement_wallet_address:
          v.venue_settlement_wallet_address ??
          existing.venue_settlement_wallet_address,
        usdc_asset_config:
          v.usdc_asset_config !== undefined
            ? v.usdc_asset_config
            : existing.usdc_asset_config,
      };
      const bundle =
        sponsoredActivationSettlementBundleSchema.safeParse(merged);
      if (!bundle.success) {
        return apiValidationError(bundle.error);
      }
    }

    if (v.status === 'active' && existing.status !== 'active') {
      const activeItems = await countActiveRewardItemsForActivation(
        existing.id
      );
      if (activeItems < 1) {
        return apiValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message:
                'At least one active reward item is required before status can be active',
              path: ['status'],
            },
          ])
        );
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(v)) {
      if (val !== undefined) {
        patch[key] = val;
      }
    }

    const nextStarts = (v.starts_at ?? existing.starts_at) as string;
    const nextEnds = (v.ends_at ?? existing.ends_at) as string;
    if (new Date(nextEnds) <= new Date(nextStarts)) {
      return apiValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'ends_at must be after starts_at',
            path: ['ends_at'],
          },
        ])
      );
    }

    const updated = await updateSponsoredActivation(existing.id, patch);
    if (!updated) {
      return apiError('Sponsored activation not found', 404);
    }

    return apiSuccess({
      activation: sponsoredActivationAdminEnvelope(updated),
    });
  } catch (error) {
    console.error(
      'PATCH /api/admin/sponsored-activations/[activationId]:',
      error
    );
    return apiError('Failed to update sponsored activation', 500);
  }
}
