import { z } from 'zod';

/** POST /api/spend-experiences/{experienceId}/sessions */
export const createSpendSessionBodySchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'walletAddress is required')
    .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
      message: 'walletAddress must be a valid EVM address',
    }),
});

export type CreateSpendSessionBody = z.infer<
  typeof createSpendSessionBodySchema
>;

/** POST /api/spend-sessions/{sessionId}/conversion/preview */
export const spendConversionPreviewBodySchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'walletAddress is required')
    .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
      message: 'walletAddress must be a valid EVM address',
    }),
});

export type SpendConversionPreviewBody = z.infer<
  typeof spendConversionPreviewBodySchema
>;
