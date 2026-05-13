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
  intent: z.enum(['confirm', 'retry_conversion']).optional().default('confirm'),
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
export const spendPaymentConfirmBodySchema = z
  .object({
    walletAddress: evmAddressField,
    paymentTxHash: z.string().trim().optional(),
    stellarBackendConfirm: z.literal(true).optional(),
  })
  .superRefine((val, ctx) => {
    const hash = val.paymentTxHash?.trim() ?? '';
    if (val.stellarBackendConfirm === true) {
      if (hash.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'paymentTxHash must not be sent for Stellar backend confirmations',
          path: ['paymentTxHash'],
        });
      }
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'paymentTxHash must be a 32-byte hex hash with 0x prefix',
        path: ['paymentTxHash'],
      });
    }
  });

export type SpendPaymentConfirmBody = z.infer<
  typeof spendPaymentConfirmBodySchema
>;
