import { z } from 'zod';

const cancelRedemptionWalletAddressSchema = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

export const activationCancelRedemptionBodySchema = z
  .object({
    walletAddress: cancelRedemptionWalletAddressSchema,
    redemptionId: z.string().uuid('redemptionId must be a valid UUID'),
    reason: z
      .string()
      .max(500, 'reason must be at most 500 characters')
      .optional(),
  })
  .strict();

export type ActivationCancelRedemptionBody = z.infer<
  typeof activationCancelRedemptionBodySchema
>;
