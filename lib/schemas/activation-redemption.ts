import { z } from 'zod';

/**
 * `activation_redemption.status` — matches
 * `database/irl-51-sponsored-activation-schema.sql` CHECK constraint.
 */
export const activationRedemptionStatusSchema = z.enum([
  'eligible',
  'available',
  'purchase_confirmed',
  'ready_to_redeem',
  'redeemed',
  'settlement_pending',
  'settlement_confirmed',
  'settlement_failed',
  'cancelled',
  'expired',
]);

export type ActivationRedemptionStatus = z.infer<
  typeof activationRedemptionStatusSchema
>;
