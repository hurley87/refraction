import { z } from 'zod';
import { walletAddressSchema } from './player';

export const createSpendItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  points_cost: z.number().int().min(1, 'Points cost must be at least 1'),
  is_active: z.boolean().optional().default(true),
});

export const updateSpendItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  points_cost: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

export const spendPointsSchema = z.object({
  spendItemId: z.string().uuid('Invalid spend item ID'),
  walletAddress: walletAddressSchema,
});

export const fulfillRedemptionSchema = z.object({
  redemptionId: z.string().uuid('Invalid redemption ID'),
});
