import { z } from 'zod';

const evmAddressField = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

/** POST /api/spend-experiences/{experienceId}/sessions */
export const createSpendSessionBodySchema = z.object({
  walletAddress: evmAddressField,
});

export type CreateSpendSessionBody = z.infer<
  typeof createSpendSessionBodySchema
>;

/** POST /api/spend-sessions/{sessionId}/conversion/preview */
export const spendConversionPreviewBodySchema = z.object({
  walletAddress: evmAddressField,
});

export type SpendConversionPreviewBody = z.infer<
  typeof spendConversionPreviewBodySchema
>;

/** POST /api/spend-sessions/{sessionId}/conversion/confirm */
export const spendConversionConfirmBodySchema = z.object({
  walletAddress: evmAddressField,
});

export type SpendConversionConfirmBody = z.infer<
  typeof spendConversionConfirmBodySchema
>;

/** POST /api/spend-sessions/{sessionId}/payment/prepare */
export const spendPaymentPrepareBodySchema = z.object({
  walletAddress: evmAddressField,
});

export type SpendPaymentPrepareBody = z.infer<
  typeof spendPaymentPrepareBodySchema
>;

/** POST /api/spend-sessions/{sessionId}/payment/confirm */
export const spendPaymentConfirmBodySchema = z.object({
  walletAddress: evmAddressField,
  paymentTxHash: z
    .string()
    .min(1, 'paymentTxHash is required')
    .refine((s) => /^0x[a-fA-F0-9]{64}$/.test(s.trim()), {
      message: 'paymentTxHash must be a 32-byte hex hash with 0x prefix',
    }),
});

export type SpendPaymentConfirmBody = z.infer<
  typeof spendPaymentConfirmBodySchema
>;
