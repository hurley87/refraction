import { z } from 'zod';

export const sponsoredActivationCampaignWithdrawRequestSchema = z.object({
  destinationAddress: z
    .string()
    .trim()
    .min(1, 'Destination address is required'),
  /** Omit or null to withdraw the full withdrawable USDC balance (6 decimals on Base). */
  amountUsdc: z.number().positive().finite().optional().nullable(),
});

export type SponsoredActivationCampaignWithdrawRequest = z.infer<
  typeof sponsoredActivationCampaignWithdrawRequestSchema
>;
