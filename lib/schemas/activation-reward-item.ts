import { z } from 'zod';

/**
 * Admin body for `activation_reward_item` create (parent `activation_id` typically from route).
 */
export const createActivationRewardItemSchema = z
  .object({
    name: z.string().min(1).max(512),
    hero_image_url: z.string().max(2048).optional().nullable(),
    description: z.string().max(10000).optional().nullable(),
    points_cost: z.coerce.number().int().min(0).default(0),
    usdc_amount: z.coerce.number().positive().max(1e15),
    sort_order: z.coerce.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
    max_per_user: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const updateActivationRewardItemSchema = z
  .object({
    name: z.string().min(1).max(512).optional(),
    hero_image_url: z.string().max(2048).optional().nullable(),
    description: z.string().max(10000).optional().nullable(),
    points_cost: z.coerce.number().int().min(0).optional(),
    usdc_amount: z.coerce.number().positive().max(1e15).optional(),
    sort_order: z.coerce.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    max_per_user: z.coerce.number().int().min(1).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type CreateActivationRewardItemInput = z.infer<
  typeof createActivationRewardItemSchema
>;
export type UpdateActivationRewardItemInput = z.infer<
  typeof updateActivationRewardItemSchema
>;
