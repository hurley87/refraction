import { z } from "zod";
import { walletAddressSchema } from "./player";

/**
 * Schema for creating a perk
 */
export const createPerkSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  location: z.string().max(200).optional(),
  points_threshold: z.number().int().min(0),
  website_url: z.string().url().optional(),
  type: z.string().min(1),
  end_date: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
  thumbnail_url: z.string().url().optional(),
  hero_image: z.string().url().optional(),
});

/**
 * Schema for updating a perk
 */
export const updatePerkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  location: z.string().max(200).optional(),
  points_threshold: z.number().int().min(0).optional(),
  website_url: z.string().url().optional(),
  type: z.string().min(1).optional(),
  end_date: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
  thumbnail_url: z.string().url().optional(),
  hero_image: z.string().url().optional(),
});

/**
 * Schema for perk redemption request
 */
export const redeemPerkSchema = z.object({
  perkId: z.string().uuid(),
  walletAddress: walletAddressSchema,
});

/**
 * Schema for creating discount codes
 */
export const createDiscountCodesSchema = z.object({
  perkId: z.string().uuid(),
  codes: z.array(z.string().min(1).max(100)).min(1),
  isUniversal: z.boolean().default(false),
});

/**
 * Schema for location list creation
 */
export const createLocationListSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(1000).nullable().optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").nullable().optional(),
  is_active: z.boolean().default(true),
});

/**
 * Schema for updating location list
 */
export const updateLocationListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(1000).nullable().optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").nullable().optional(),
  is_active: z.boolean().optional(),
});

