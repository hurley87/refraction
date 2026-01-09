import { NextRequest } from "next/server";
import { createOrUpdatePlayer } from "@/lib/db/players";
import type { Player } from "@/lib/types";
import { checkinRequestSchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";
import { processCheckin, extractErrorMessage } from "@/lib/api/checkin-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = checkinRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, email, checkpoint } = validationResult.data;

    const playerData: Omit<Player, "id" | "created_at" | "updated_at"> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: undefined,
      total_points: 0,
    };

    const player = await createOrUpdatePlayer(playerData);

    const result = await processCheckin({
      player,
      checkpoint,
      email,
      chain: "evm",
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
