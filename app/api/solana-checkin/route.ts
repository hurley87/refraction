import { NextRequest } from "next/server";
import { createOrUpdatePlayerForSolana } from "@/lib/db/players";
import { apiSuccess, apiError } from "@/lib/api/response";
import { processCheckin, extractErrorMessage } from "@/lib/api/checkin-handler";

export async function POST(req: NextRequest) {
  try {
    const { solanaWalletAddress, email, checkpoint } = await req.json();

    if (!solanaWalletAddress || !checkpoint) {
      return apiError("Solana wallet address and checkpoint are required", 400);
    }

    const player = await createOrUpdatePlayerForSolana(solanaWalletAddress, email);

    const result = await processCheckin({
      player,
      checkpoint,
      email,
      chain: "solana",
      chainWalletAddress: solanaWalletAddress,
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
    console.error("Error processing Solana checkin:", e);
    return apiError(extractErrorMessage(e), 500);
  }
}
