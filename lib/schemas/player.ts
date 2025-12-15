import { z } from "zod";

/**
 * Validates EVM wallet address format (0x followed by 40 hex characters)
 */
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address");

/**
 * Validates Solana wallet address format (base58, 32-44 characters)
 */
export const solanaWalletAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid Solana wallet address");

/**
 * Validates Stellar wallet address format (G followed by 55 base32 characters)
 */
export const stellarWalletAddressSchema = z
  .string()
  .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar wallet address");

/**
 * Schema for creating or updating a player
 */
export const createPlayerSchema = z.object({
  wallet_address: walletAddressSchema.optional(),
  solana_wallet_address: solanaWalletAddressSchema.optional(),
  stellar_wallet_address: stellarWalletAddressSchema.optional(),
  stellar_wallet_id: z.string().optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  total_points: z.number().int().min(0).default(0),
});

/**
 * Schema for updating user profile
 */
export const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).optional(),
  website: z.string().url().optional(),
  twitter_handle: z.string().min(1).max(50).optional(),
  towns_handle: z.string().min(1).max(50).optional(),
  farcaster_handle: z.string().min(1).max(50).optional(),
  telegram_handle: z.string().min(1).max(50).optional(),
  profile_picture_url: z.string().url().optional(),
});

/**
 * Schema for profile field points award
 */
export const awardProfileFieldPointsSchema = z.object({
  walletAddress: walletAddressSchema,
  fieldType: z.string().min(1),
  fieldValue: z.string().min(1),
});

