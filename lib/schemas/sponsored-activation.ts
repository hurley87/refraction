import { z } from 'zod';
import { getAddress, isAddress } from 'viem';
import {
  activationEligibilityRulesConfigSchema,
  DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG,
} from '@/lib/schemas/activation-eligibility-config';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';
import {
  getSponsoredActivationBaseTokenBySymbol,
  SPONSORED_ACTIVATION_BASE_TOKENS,
  SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS,
  type SponsoredActivationBaseTokenSymbol,
} from '@/lib/schemas/sponsored-activation-tokens';
import { TEMPO_CADD_CONTRACT_ADDRESS } from '@/lib/activation/tempo-config';

/**
 * `sponsored_activation.settlement_rail` — matches DB CHECK
 * (`database/irl-51-sponsored-activation-schema.sql`).
 */
export const settlementRailSchema = z.enum(['base', 'stellar', 'tempo']);

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

/**
 * Base settlement payment token, chosen by the admin at create time
 * (`payment_token`). Defaults to `USDC` when omitted for backward
 * compatibility.
 */
export const sponsoredActivationBaseTokenSymbolSchema = z.enum(
  SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS as [string, ...string[]]
);

export const baseUsdcAssetConfigSchema = z
  .object({
    contract_address: normalizedEvmAddressSchema,
    /** Present for activations created after multi-token support (IRL CADD); absent means legacy USDC. */
    symbol: z.string().optional(),
  })
  .strict();

export const stellarUsdcAssetConfigSchema = z
  .object({
    asset_code: stellarAssetCodeSchema,
    issuer: stellarGAddressSchema,
  })
  .strict();

export const tempoCaddAssetConfigSchema = z
  .object({
    contract_address: normalizedEvmAddressSchema.refine(
      (address) => address === TEMPO_CADD_CONTRACT_ADDRESS,
      { message: 'Tempo settlement requires the configured CADD contract' }
    ),
    symbol: z.literal('CADD'),
  })
  .strict();

/**
 * Full settlement bundle — rail must match wallet formats and `usdc_asset_config`.
 * Used after admin PATCH merges existing row + patch so draft updates cannot save incoherent combinations.
 */
export const sponsoredActivationSettlementBundleSchema = z
  .discriminatedUnion('settlement_rail', [
    z
      .object({
        settlement_rail: z.literal('base'),
        campaign_wallet_address: normalizedEvmAddressSchema,
        venue_settlement_wallet_address: normalizedEvmAddressSchema,
        usdc_asset_config: baseUsdcAssetConfigSchema,
      })
      .strict(),
    z
      .object({
        settlement_rail: z.literal('tempo'),
        campaign_wallet_address: normalizedEvmAddressSchema,
        venue_settlement_wallet_address: normalizedEvmAddressSchema,
        usdc_asset_config: tempoCaddAssetConfigSchema,
      })
      .strict(),
    z
      .object({
        settlement_rail: z.literal('stellar'),
        campaign_wallet_address: stellarGAddressSchema,
        venue_settlement_wallet_address: stellarGAddressSchema,
        usdc_asset_config: stellarUsdcAssetConfigSchema,
      })
      .strict(),
  ])
  .superRefine((data, ctx) => {
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
  });

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
  description: z.string().trim().max(10000).optional().nullable(),
  sponsor_name: z.string().min(1).max(512),
  event_id: z.string().min(1).max(512).optional().nullable(),
  status: sponsoredActivationStatusSchema.default('draft'),
  max_redemptions: positiveIntOrNullSchema.optional(),
  max_usdc_budget: positiveDecimalOrNullSchema.optional(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  eligibility_config: activationEligibilityRulesConfigSchema,
  created_by: z.string().max(255).optional().nullable(),
};

const createSponsoredActivationBaseObject = z
  .object({
    ...sponsoredActivationCommonCreateFields,
    settlement_rail: z.literal('base'),
    campaign_wallet_address: normalizedEvmAddressSchema,
    venue_settlement_wallet_address: normalizedEvmAddressSchema,
    usdc_asset_config: baseUsdcAssetConfigSchema,
    /** Which Base token to settle in (admin create only; ignored once `usdc_asset_config` is explicit). */
    payment_token: sponsoredActivationBaseTokenSymbolSchema.optional(),
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

const createSponsoredActivationTempoObject = z
  .object({
    ...sponsoredActivationCommonCreateFields,
    settlement_rail: z.literal('tempo'),
    campaign_wallet_address: normalizedEvmAddressSchema,
    venue_settlement_wallet_address: normalizedEvmAddressSchema,
    usdc_asset_config: tempoCaddAssetConfigSchema,
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
    createSponsoredActivationTempoObject,
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
  createSponsoredActivationBaseObject
    .omit({
      campaign_wallet_address: true,
      slug: true,
      usdc_asset_config: true,
    })
    .extend({
      eligibility_config: activationEligibilityRulesConfigSchema
        .optional()
        .default(DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG),
    });
const adminCreateSponsoredActivationStellarObject =
  createSponsoredActivationStellarObject
    .omit({
      campaign_wallet_address: true,
      slug: true,
      usdc_asset_config: true,
    })
    .extend({
      eligibility_config: activationEligibilityRulesConfigSchema
        .optional()
        .default(DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG),
    });
const adminCreateSponsoredActivationTempoObject =
  createSponsoredActivationTempoObject
    .omit({
      campaign_wallet_address: true,
      slug: true,
      usdc_asset_config: true,
    })
    .extend({
      eligibility_config: activationEligibilityRulesConfigSchema
        .optional()
        .default(DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG),
    });

/**
 * Resolves the admin's `payment_token` choice (default `USDC`) to the
 * `usdc_asset_config` persisted for a Base-rail activation.
 */
export function resolveAdminBaseSponsoredActivationAssetConfig(
  paymentToken: string | undefined
): { contract_address: `0x${string}`; symbol: string } {
  const symbol: SponsoredActivationBaseTokenSymbol =
    getSponsoredActivationBaseTokenBySymbol(paymentToken ?? 'USDC')?.symbol ??
    'USDC';
  return {
    contract_address: SPONSORED_ACTIVATION_BASE_TOKENS[symbol].contract_address,
    symbol,
  };
}

/**
 * Admin POST body: campaign wallet is provisioned server-side (Privy on Base; shared env wallet on Stellar).
 */
export const adminCreateSponsoredActivationRequestSchema = z
  .discriminatedUnion('settlement_rail', [
    adminCreateSponsoredActivationBaseObject,
    adminCreateSponsoredActivationStellarObject,
    adminCreateSponsoredActivationTempoObject,
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
    eligibility_config: activationEligibilityRulesConfigSchema.optional(),
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
  if (next.settlement_rail === 'base' || next.settlement_rail === 'tempo') {
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

      if (rail === 'tempo' && (hasCampaign || hasVenue || hasConfig)) {
        for (const [key, value] of [
          ['campaign_wallet_address', data.campaign_wallet_address],
          [
            'venue_settlement_wallet_address',
            data.venue_settlement_wallet_address,
          ],
        ] as const) {
          if (value !== undefined && !tryNormalizeEvmAddress(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid EVM wallet address',
              path: [key],
            });
          }
        }
        if (hasConfig) {
          mergeConfigParseIssues(
            tempoCaddAssetConfigSchema.safeParse(data.usdc_asset_config),
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
