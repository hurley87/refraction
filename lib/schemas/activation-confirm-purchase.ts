import { z } from 'zod';

const confirmPurchaseWalletAddressSchema = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

export const activationConfirmPurchaseBodySchema = z
  .object({
    walletAddress: confirmPurchaseWalletAddressSchema,
    redemptionId: z.string().uuid('redemptionId must be a valid UUID'),
  })
  .strict();

export type ActivationConfirmPurchaseBody = z.infer<
  typeof activationConfirmPurchaseBodySchema
>;
