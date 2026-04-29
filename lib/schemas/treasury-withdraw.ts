import { z } from 'zod';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';

export const treasuryWithdrawRequestSchema = z.object({
  destinationAddress: z
    .string()
    .trim()
    .min(1, 'Destination address is required')
    .refine((v) => isEvmAddress(v), 'Invalid Ethereum address'),
  /** Omit or null to withdraw the full USDC balance at max precision (6 decimals). */
  amountUsdc: z.number().positive().finite().optional().nullable(),
});

export type TreasuryWithdrawRequest = z.infer<
  typeof treasuryWithdrawRequestSchema
>;
