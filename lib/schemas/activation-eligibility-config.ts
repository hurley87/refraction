import { z } from 'zod';

/**
 * Strict `sponsored_activation.eligibility_config` for Public Records pilot (IRL-57).
 * Unknown keys are rejected (`.strict()`). Used on admin writes and when recording eligibility.
 */
export const activationEligibilityRulesConfigSchema = z
  .object({
    max_events_per_user: z.number().int().positive(),
    max_events_per_user_per_day: z.number().int().positive(),
    required_checkpoint_ids: z.array(z.string().min(1)),
    min_tier: z.number().int().positive().optional(),
  })
  .strict();

export type ActivationEligibilityRulesConfig = z.infer<
  typeof activationEligibilityRulesConfigSchema
>;

export function parseActivationEligibilityRulesConfig(
  raw: unknown
): ActivationEligibilityRulesConfig {
  return activationEligibilityRulesConfigSchema.parse(raw);
}

export function safeParseActivationEligibilityRulesConfig(
  raw: unknown
): z.SafeParseReturnType<unknown, ActivationEligibilityRulesConfig> {
  return activationEligibilityRulesConfigSchema.safeParse(raw);
}
