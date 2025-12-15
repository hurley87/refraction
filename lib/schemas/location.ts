import { z } from "zod";

/**
 * Validates latitude (-90 to 90)
 */
export const latitudeSchema = z.number().min(-90).max(90);

/**
 * Validates longitude (-180 to 180)
 */
export const longitudeSchema = z.number().min(-180).max(180);

/**
 * Schema for creating or updating a location
 */
export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  display_name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  place_id: z.string().min(1),
  points_value: z.number().int().min(0),
  type: z.string().optional(),
  event_url: z.string().url().nullable().optional(),
  context: z.string().optional(),
  coin_address: z.string().optional(),
  coin_symbol: z.string().optional(),
  coin_name: z.string().optional(),
  coin_image_url: z.string().url().nullable().optional(),
  coin_transaction_hash: z.string().optional(),
  creator_wallet_address: z.string().optional(),
  creator_username: z.string().optional(),
});

/**
 * Schema for updating location fields
 */
export const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  display_name: z.string().min(1).max(200).optional(),
  place_id: z.string().min(1).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  creator_wallet_address: z.string().optional(),
  creator_username: z.string().optional(),
  coin_image_url: z.string().url().nullable().optional(),
  type: z.string().optional(),
  event_url: z.string().url().nullable().optional(),
});

/**
 * Schema for location search/options
 */
export const locationSearchSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(250).default(250),
});

