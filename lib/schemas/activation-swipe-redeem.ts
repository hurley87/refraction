import { z } from 'zod';

const swipeRedeemWalletAddressSchema = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

export const activationSwipeRedeemBodySchema = z
  .object({
    walletAddress: swipeRedeemWalletAddressSchema,
    redemptionId: z.string().uuid('redemptionId must be a valid UUID'),
  })
  .strict();

export type ActivationSwipeRedeemBody = z.infer<
  typeof activationSwipeRedeemBodySchema
>;
