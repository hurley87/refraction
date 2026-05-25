import { z } from 'zod';

/**
 * `activation_eligibility_event.source` — matches
 * `database/irl-51-sponsored-activation-schema.sql` CHECK constraint.
 */
export const activationEligibilitySourceSchema = z.enum([
  'checkpoint_checkin',
  'location_checkin',
  'qr_scan',
  'nfc',
  'ticket_scan',
]);

export type ActivationEligibilitySource = z.infer<
  typeof activationEligibilitySourceSchema
>;

/**
 * v1 activation-side eligibility rules: permissive object (not a strict rules engine).
 */
export const eligibilityConfigValueSchema = z.object({}).catchall(z.unknown());

/** JSON object with optional loose keys; defaults to `{}` for create payloads. */
export const eligibilityConfigSchema = eligibilityConfigValueSchema.default({});

export type EligibilityConfig = z.infer<typeof eligibilityConfigValueSchema>;
