import { NextRequest } from "next/server";
import {
  createOrUpdatePlayer,
  createOrUpdatePlayerForSolana,
  createOrUpdatePlayerForStellar,
} from "@/lib/db/players";
import type { Player } from "@/lib/types";
import {
  checkinRequestSchema,
  unifiedCheckinRequestSchema,
} from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";
import { processCheckin, extractErrorMessage } from "@/lib/api/checkin-handler";
import type { CheckinChain } from "@/lib/api/checkin-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Try unified schema first (with chain parameter)
    const validationResult = unifiedCheckinRequestSchema.safeParse(body);
    let chain: CheckinChain = "evm";
    let walletAddress: string;
    let email: string | undefined;
    let checkpoint: string;

    if (validationResult.success) {
      // Unified format with chain parameter
      ({ chain, walletAddress, email, checkpoint } = validationResult.data);
    } else {
      // Check if body contains a chain field - if so, it must be valid
      if ("chain" in body && body.chain !== undefined) {
        // Chain field present but invalid - reject the request
        return apiValidationError(validationResult.error);
      }

      // Fallback to legacy format (backward compatibility)
      // Only allow legacy format if no chain field is present
      const legacyResult = checkinRequestSchema.safeParse(body);
      if (!legacyResult.success) {
        return apiValidationError(legacyResult.error);
      }
      // Legacy format defaults to EVM
      chain = "evm";
      ({ walletAddress, email, checkpoint } = legacyResult.data);
    }

    // Validate wallet address is provided
    if (!walletAddress) {
      return apiError("Wallet address is required", 400);
    }

    // Create or update player based on chain type
    let player: Player;
    switch (chain) {
      case "evm": {
        const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
          wallet_address: walletAddress,
          email: email || undefined,
          username: undefined,
          total_points: 0,
        };
        player = await createOrUpdatePlayer(playerData);
        break;
      }
      case "solana":
        player = await createOrUpdatePlayerForSolana(walletAddress, email);
        break;
      case "stellar":
        player = await createOrUpdatePlayerForStellar(walletAddress, email);
        break;
      default:
        return apiError(`Unsupported chain type: ${chain}`, 400);
    }

    const result = await processCheckin({
      player,
      checkpoint,
      email,
      chain,
      chainWalletAddress: walletAddress,
    });

    if (!result.success) {
      const status = result.rateLimited ? 429 : 500;
      return apiError(result.error, status as 429 | 500);
    }

    return apiSuccess(
      {
        player: result.player,
        pointsAwarded: result.pointsAwarded,
        pointsEarnedToday: result.pointsEarnedToday,
        dailyRewardClaimed: result.dailyRewardClaimed,
        checkpointActivityId: result.checkpointActivityId,
      },
      result.message,
    );
  } catch (e) {
    console.error("Error processing checkin:", e);
    return apiError(extractErrorMessage(e), 500);
  }
}
