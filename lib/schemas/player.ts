import { z } from 'zod';
import { usernameSchema } from '@/lib/username';

/**
 * Validates EVM wallet address format (0x followed by 40 hex characters)
 */
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM wallet address');

/**
 * Validates Solana wallet address format (base58, 32-44 characters)
 */
export const solanaWalletAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana wallet address');

/**
 * Validates Stellar wallet address format (G followed by 55 base32 characters)
 */
export const stellarWalletAddressSchema = z
  .string()
  .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address');

/**
 * Validates Aptos wallet address format (0x followed by 64 hex characters)
 */
export const aptosWalletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid Aptos wallet address');

/**
 * Schema for creating or updating a player
 */
export const createPlayerSchema = z.object({
  wallet_address: walletAddressSchema.optional(),
  solana_wallet_address: solanaWalletAddressSchema.optional(),
  stellar_wallet_address: stellarWalletAddressSchema.optional(),
  stellar_wallet_id: z.string().optional(),
  aptos_wallet_address: aptosWalletAddressSchema.optional(),
  aptos_wallet_id: z.string().optional(),
  email: z.string().email().optional(),
  username: usernameSchema.optional(),
  total_points: z.number().int().min(0).default(0),
});

/** Mapbox POI stored on player profile favorites. */
export const profileFavoritePlaceSchema = z.object({
  place_id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  address: z.string().max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  image_url: z.string().url().nullable().optional(),
  category: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      slug: z.string().min(1),
    })
    .nullable()
    .optional(),
});

/**
 * Schema for updating user profile
 */
export const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  username: usernameSchema.optional(),
  website: z.string().url().optional(),
  twitter_handle: z.string().min(1).max(50).optional(),
  towns_handle: z.string().min(1).max(50).optional(),
  farcaster_handle: z.string().min(1).max(50).optional(),
  telegram_handle: z.string().min(1).max(50).optional(),
  instagram_handle: z.string().min(1).max(50).optional(),
  profile_picture_url: z.string().url().optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  favorite_music_venue: profileFavoritePlaceSchema.nullable().optional(),
  favorite_gallery: profileFavoritePlaceSchema.nullable().optional(),
  favorite_restaurant: profileFavoritePlaceSchema.nullable().optional(),
});

/**
 * Schema for setting player geo location from a Mapbox place selection.
 */
export const updatePlayerLocationSchema = z.object({
  walletAddress: walletAddressSchema,
  countryId: z.string().uuid(),
  mapboxId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  region: z.string().max(200).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const geoCitySuggestQuerySchema = z.object({
  countryIso2: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/, 'Invalid country ISO2'),
  q: z.string().min(2).max(100),
});

/**
 * Schema for profile field points award
 */
export const awardProfileFieldPointsSchema = z.object({
  walletAddress: walletAddressSchema,
  fieldType: z.string().min(1),
  fieldValue: z.string().min(1),
});
