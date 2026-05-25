import { z } from 'zod';
import { getAddress, isAddress } from 'viem';
import {
  eligibilityConfigSchema,
  eligibilityConfigValueSchema,
} from '@/lib/schemas/activation-eligibility';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';

/**
 * `sponsored_activation.settlement_rail` — matches DB CHECK
 * (`database/irl-51-sponsored-activation-schema.sql`).
 */
export const settlementRailSchema = z.enum(['base', 'stellar']);

/**
 * `sponsored_activation.status` — matches DB CHECK.
 */
export const sponsoredActivationStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'ended',
]);

/** EIP-55–normalized EVM address after successful parse. */
export const normalizedEvmAddressSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => isAddress(s), { message: 'Invalid EVM wallet address' })
  .transform((s) => getAddress(s as `0x${string}`));

const stellarGAddressSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(stellarWalletAddressSchema);

const stellarAssetCodeSchema = z
  .string()
  .min(1)
  .max(12)
  .regex(/^[a-zA-Z0-9]+$/, 'Invalid Stellar asset code');

export const baseUsdcAssetConfigSchema = z
  .object({
    contract_address: normalizedEvmAddressSchema,
  })
  .strict();

export const stellarUsdcAssetConfigSchema = z
  .object({
    asset_code: stellarAssetCodeSchema,
    issuer: stellarGAddressSchema,
  })
  .strict();

const positiveIntOrNullSchema = z.union([
  z.null(),
  z.number().int().positive(),
]);

const positiveDecimalOrNullSchema = z.union([
  z.null(),
  z.number().positive().max(1e15),
]);

const sponsoredActivationCommonCreateFields = {
  slug: z.string().min(1).max(256),
  title: z.string().min(1).max(512),
  sponsor_name: z.string().min(1).max(512),
  event_id: z.string().min(1).max(512).optional().nullable(),
  status: sponsoredActivationStatusSchema.default('draft'),
  max_redemptions: positiveIntOrNullSchema.optional(),
  max_usdc_budget: positiveDecimalOrNullSchema.optional(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  eligibility_config: eligibilityConfigSchema,
  created_by: z.string().max(255).optional().nullable(),
};

const createSponsoredActivationBaseObject = z
  .object({
    ...sponsoredActivationCommonCreateFields,
    settlement_rail: z.literal('base'),
    campaign_wallet_address: normalizedEvmAddressSchema,
    venue_settlement_wallet_address: normalizedEvmAddressSchema,
    usdc_asset_config: baseUsdcAssetConfigSchema,
  })
  .strict();

const createSponsoredActivationStellarObject = z
  .object({
    ...sponsoredActivationCommonCreateFields,
    settlement_rail: z.literal('stellar'),
    campaign_wallet_address: stellarGAddressSchema,
    venue_settlement_wallet_address: stellarGAddressSchema,
    usdc_asset_config: stellarUsdcAssetConfigSchema,
  })
  .strict();

/**
 * Rail-discriminated create payload (plain objects only — required for `discriminatedUnion`).
 * Prefer `createSponsoredActivationSchema` for full validation including caps and window.
 */
export const sponsoredActivationCreateDiscriminatedSchema =
  z.discriminatedUnion('settlement_rail', [
    createSponsoredActivationBaseObject,
    createSponsoredActivationStellarObject,
  ]);

export const createSponsoredActivationSchema =
  sponsoredActivationCreateDiscriminatedSchema.superRefine((data, ctx) => {
    if (
      sameWalletAddress(
        data.campaign_wallet_address,
        data.venue_settlement_wallet_address
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'campaign_wallet_address must differ from venue_settlement_wallet_address',
        path: ['venue_settlement_wallet_address'],
      });
    }
    if (new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ends_at must be after starts_at',
        path: ['ends_at'],
      });
    }
    const hasRedemptions =
      data.max_redemptions != null && data.max_redemptions > 0;
    const hasBudget = data.max_usdc_budget != null && data.max_usdc_budget > 0;
    if (!hasRedemptions && !hasBudget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one of max_redemptions or max_usdc_budget is required on create',
        path: ['max_redemptions'],
      });
    }
  });

const adminCreateSponsoredActivationBaseObject =
  createSponsoredActivationBaseObject.omit({ campaign_wallet_address: true });
const adminCreateSponsoredActivationStellarObject =
  createSponsoredActivationStellarObject.omit({
    campaign_wallet_address: true,
  });

/**
 * Admin POST body: `campaign_wallet_address` is provisioned server-side (Privy), not supplied by the client.
 */
export const adminCreateSponsoredActivationRequestSchema = z
  .discriminatedUnion('settlement_rail', [
    adminCreateSponsoredActivationBaseObject,
    adminCreateSponsoredActivationStellarObject,
  ])
  .superRefine((data, ctx) => {
    if (new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ends_at must be after starts_at',
        path: ['ends_at'],
      });
    }
    const hasRedemptions =
      data.max_redemptions != null && data.max_redemptions > 0;
    const hasBudget = data.max_usdc_budget != null && data.max_usdc_budget > 0;
    if (!hasRedemptions && !hasBudget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one of max_redemptions or max_usdc_budget is required on create',
        path: ['max_redemptions'],
      });
    }
  });

export type AdminCreateSponsoredActivationRequest = z.infer<
  typeof adminCreateSponsoredActivationRequestSchema
>;

function mergeConfigParseIssues(
  result: z.SafeParseReturnType<unknown, unknown>,
  ctx: z.RefinementCtx,
  path: (string | number)[]
) {
  if (result.success) return;
  for (const issue of result.error.issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [...path, ...issue.path],
    });
  }
}

const updateSponsoredActivationBaseObject = z
  .object({
    slug: z.string().min(1).max(256).optional(),
    title: z.string().min(1).max(512).optional(),
    sponsor_name: z.string().min(1).max(512).optional(),
    event_id: z.string().min(1).max(512).optional().nullable(),
    status: sponsoredActivationStatusSchema.optional(),
    max_redemptions: positiveIntOrNullSchema.optional(),
    max_usdc_budget: positiveDecimalOrNullSchema.optional(),
    starts_at: z.string().datetime({ offset: true }).optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
    eligibility_config: eligibilityConfigValueSchema.optional(),
    created_by: z.string().max(255).optional().nullable(),
    settlement_rail: settlementRailSchema.optional(),
    campaign_wallet_address: z.string().optional(),
    venue_settlement_wallet_address: z.string().optional(),
    usdc_asset_config: z.unknown().optional(),
  })
  .strict();

function normalizeUpdatePayload(
  data: z.infer<typeof updateSponsoredActivationBaseObject>
): z.infer<typeof updateSponsoredActivationBaseObject> {
  const next = { ...data };
  if (next.settlement_rail === 'base') {
    if (next.campaign_wallet_address !== undefined) {
      const n = tryNormalizeEvmAddress(next.campaign_wallet_address);
      if (n) next.campaign_wallet_address = n;
    }
    if (next.venue_settlement_wallet_address !== undefined) {
      const n = tryNormalizeEvmAddress(next.venue_settlement_wallet_address);
      if (n) next.venue_settlement_wallet_address = n;
    }
    if (next.usdc_asset_config && typeof next.usdc_asset_config === 'object') {
      const cfg = next.usdc_asset_config as { contract_address?: string };
      if (typeof cfg.contract_address === 'string') {
        const n = tryNormalizeEvmAddress(cfg.contract_address);
        if (n) {
          next.usdc_asset_config = { ...cfg, contract_address: n };
        }
      }
    }
  }
  if (next.settlement_rail === 'stellar') {
    if (next.campaign_wallet_address !== undefined) {
      next.campaign_wallet_address = next.campaign_wallet_address
        .trim()
        .toUpperCase();
    }
    if (next.venue_settlement_wallet_address !== undefined) {
      next.venue_settlement_wallet_address =
        next.venue_settlement_wallet_address.trim().toUpperCase();
    }
    if (next.usdc_asset_config && typeof next.usdc_asset_config === 'object') {
      const cfg = next.usdc_asset_config as {
        issuer?: string;
        asset_code?: string;
      };
      next.usdc_asset_config = {
        ...cfg,
        ...(typeof cfg.issuer === 'string'
          ? { issuer: cfg.issuer.trim().toUpperCase() }
          : {}),
        ...(typeof cfg.asset_code === 'string'
          ? { asset_code: cfg.asset_code.trim() }
          : {}),
      };
    }
  }
  return next;
}

export const updateSponsoredActivationSchema =
  updateSponsoredActivationBaseObject
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    })
    .superRefine((data, ctx) => {
      const hasCampaign = data.campaign_wallet_address !== undefined;
      const hasVenue = data.venue_settlement_wallet_address !== undefined;
      const hasConfig = data.usdc_asset_config !== undefined;
      const rail = data.settlement_rail;

      if ((hasCampaign || hasVenue || hasConfig) && rail === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'settlement_rail is required when updating wallet addresses or USDC asset config',
          path: ['settlement_rail'],
        });
        return;
      }

      if (data.starts_at !== undefined && data.ends_at !== undefined) {
        if (new Date(data.ends_at) <= new Date(data.starts_at)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'ends_at must be after starts_at',
            path: ['ends_at'],
          });
        }
      }

      if (rail === 'base' && (hasCampaign || hasVenue || hasConfig)) {
        if (hasCampaign) {
          const n = tryNormalizeEvmAddress(data.campaign_wallet_address!);
          if (!n) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid EVM wallet address',
              path: ['campaign_wallet_address'],
            });
          }
        }
        if (hasVenue) {
          const n = tryNormalizeEvmAddress(
            data.venue_settlement_wallet_address!
          );
          if (!n) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid EVM wallet address',
              path: ['venue_settlement_wallet_address'],
            });
          }
        }
        if (hasConfig) {
          mergeConfigParseIssues(
            baseUsdcAssetConfigSchema.safeParse(data.usdc_asset_config),
            ctx,
            ['usdc_asset_config']
          );
        }
      }

      if (rail === 'stellar' && (hasCampaign || hasVenue || hasConfig)) {
        if (hasCampaign) {
          const r = stellarGAddressSchema.safeParse(
            data.campaign_wallet_address
          );
          if (!r.success) {
            mergeConfigParseIssues(r, ctx, ['campaign_wallet_address']);
          }
        }
        if (hasVenue) {
          const r = stellarGAddressSchema.safeParse(
            data.venue_settlement_wallet_address
          );
          if (!r.success) {
            mergeConfigParseIssues(r, ctx, ['venue_settlement_wallet_address']);
          }
        }
        if (hasConfig) {
          mergeConfigParseIssues(
            stellarUsdcAssetConfigSchema.safeParse(data.usdc_asset_config),
            ctx,
            ['usdc_asset_config']
          );
        }
      }

      if (
        rail !== undefined &&
        hasCampaign &&
        hasVenue &&
        data.campaign_wallet_address !== undefined &&
        data.venue_settlement_wallet_address !== undefined
      ) {
        if (
          sameWalletAddress(
            data.campaign_wallet_address,
            data.venue_settlement_wallet_address
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'campaign_wallet_address must differ from venue_settlement_wallet_address',
            path: ['venue_settlement_wallet_address'],
          });
        }
      }
    })
    .transform((data) => normalizeUpdatePayload(data));

export type CreateSponsoredActivationInput = z.infer<
  typeof createSponsoredActivationSchema
>;
export type UpdateSponsoredActivationInput = z.infer<
  typeof updateSponsoredActivationSchema
>;
