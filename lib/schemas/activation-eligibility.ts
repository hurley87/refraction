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
 * v1 user-facing eligibility recording (IRL-57): only checkpoint + QR.
 * Other DB enum values are rejected at the API layer with validation errors.
 */
export const sponsoredActivationUserEligibilitySourceSchema = z.enum([
  'checkpoint_checkin',
  'qr_scan',
]);

export type SponsoredActivationUserEligibilitySource = z.infer<
  typeof sponsoredActivationUserEligibilitySourceSchema
>;

const eligibilityWalletAddressSchema = z
  .string()
  .min(1, 'walletAddress is required')
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s.trim()), {
    message: 'walletAddress must be a valid EVM address',
  });

/** POST /api/sponsored-activations/{activationIdOrSlug}/eligibility */
export const recordSponsoredActivationEligibilityBodySchema = z
  .object({
    walletAddress: eligibilityWalletAddressSchema,
    source: sponsoredActivationUserEligibilitySourceSchema,
    source_ref_id: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type RecordSponsoredActivationEligibilityBody = z.infer<
  typeof recordSponsoredActivationEligibilityBodySchema
>;
