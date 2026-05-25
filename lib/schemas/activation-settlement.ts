import { z } from 'zod';

/**
 * `activation_settlement_transaction.status` — matches
 * `database/irl-51-sponsored-activation-schema.sql` CHECK constraint.
 */
export const activationSettlementStatusSchema = z.enum([
  'not_started',
  'queued',
  'submitted',
  'confirmed',
  'failed',
  'retrying',
]);

export type ActivationSettlementStatus = z.infer<
  typeof activationSettlementStatusSchema
>;
