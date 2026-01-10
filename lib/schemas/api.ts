import { z } from "zod";
import {
  walletAddressSchema,
  solanaWalletAddressSchema,
  stellarWalletAddressSchema,
} from "./player";

/**
 * Common query parameter schemas for pagination and filtering
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
});

/**
 * Schema for checkin API POST request (legacy EVM-only format)
 */
export const checkinRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  email: z.string().email().optional(),
  checkpoint: z.string().min(1),
});

/**
 * Schema for player API POST request (create player)
 */
export const createPlayerRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  email: z.string().email().optional(),
  username: z.string().min(1).max(30),
});

/**
 * Schema for player API GET request (query params)
 */
export const getPlayerRequestSchema = z.object({
  walletAddress: walletAddressSchema,
});

/**
 * Schema for player API PATCH request (update player)
 */
export const updatePlayerRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  username: z.string().min(1).max(30),
});

/**
 * Schema for leaderboard API GET request (query params)
 */
export const leaderboardQuerySchema = paginationSchema.extend({
  playerId: z.coerce.number().int().positive().optional(),
});

/**
 * Schema for location checkin API POST request
 */
export const locationCheckinRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  locationId: z.coerce.number().int().positive(),
  comment: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
});

/**
 * Schema for perk redemption API POST request
 */
export const redeemPerkRequestSchema = z.object({
  perkId: z.string().uuid(),
  walletAddress: walletAddressSchema,
});

/**
 * Schema for number assignment API POST request
 */
export const numberAssignmentRequestSchema = z.object({
  walletAddress: walletAddressSchema,
});

/**
 * Schema for contact API POST request
 */
export const contactRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
});

/**
 * Schema for newsletter API POST request
 */
export const newsletterRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * Schema for location comments API POST request
 */
export const locationCommentRequestSchema = z.object({
  locationId: z.coerce.number().int().positive(),
  walletAddress: walletAddressSchema,
  comment: z.string().min(1).max(500),
});

/**
 * Schema for location comments API GET request (query params)
 */
export const locationCommentsQuerySchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

/**
 * Schema for checkpoint chain types
 */
export const chainTypeSchema = z.enum(["evm", "solana", "stellar"]);

/**
 * Schema for unified checkin API POST request (supports all chains)
 * Validates wallet address format based on chain type
 */
export const unifiedCheckinRequestSchema = z
  .object({
    chain: chainTypeSchema,
    walletAddress: z.string().min(1),
    email: z.string().email().optional(),
    checkpoint: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    // Validate wallet address format based on chain type
    switch (data.chain) {
      case "evm": {
        const evmResult = walletAddressSchema.safeParse(data.walletAddress);
        if (!evmResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid EVM wallet address format",
            path: ["walletAddress"],
          });
        }
        break;
      }
      case "solana": {
        const solanaResult = solanaWalletAddressSchema.safeParse(
          data.walletAddress,
        );
        if (!solanaResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid Solana wallet address format",
            path: ["walletAddress"],
          });
        }
        break;
      }
      case "stellar": {
        const stellarResult = stellarWalletAddressSchema.safeParse(
          data.walletAddress,
        );
        if (!stellarResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid Stellar wallet address format",
            path: ["walletAddress"],
          });
        }
        break;
      }
    }
  });

/**
 * Schema for creating a checkpoint (admin)
 */
export const createCheckpointRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  chain_type: chainTypeSchema,
  points_value: z.coerce.number().int().min(1).max(10000).default(100),
  is_active: z.boolean().default(true),
  partner_image_url: z.string().url().optional().nullable(),
});

/**
 * Schema for updating a checkpoint (admin)
 */
export const updateCheckpointRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  chain_type: chainTypeSchema.optional(),
  points_value: z.coerce.number().int().min(1).max(10000).optional(),
  is_active: z.boolean().optional(),
  partner_image_url: z.string().url().optional().nullable(),
});

