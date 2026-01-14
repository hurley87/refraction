import { supabase } from "@/lib/db/client";
import { updatePlayerPoints } from "@/lib/db/players";
import { getUserProfile } from "@/lib/db/profiles";
import { trackCheckinCompleted, trackPointsEarned } from "@/lib/analytics";
import { DAILY_CHECKIN_POINTS, DAILY_CHECKPOINT_LIMIT } from "@/lib/constants";
import { getUtcDayBounds } from "@/lib/utils/date";
import type { Player } from "@/lib/types";

/**
 * Chain type for checkin operations
 */
export type CheckinChain = "evm" | "solana" | "stellar";

/**
 * Input for processing a checkin
 */
export type CheckinInput = {
  /** The player record (already created/updated) */
  player: Player;
  /** Checkpoint identifier */
  checkpoint: string;
  /** User email (optional) */
  email?: string;
  /** Chain type for this checkin */
  chain: CheckinChain;
  /** Chain-specific wallet address for querying activities */
  chainWalletAddress: string;
};

/**
 * Successful checkin result
 */
export type CheckinSuccess = {
  success: true;
  player: Player;
  pointsAwarded: number;
  pointsEarnedToday: number;
  dailyRewardClaimed: boolean;
  checkpointActivityId: number | undefined;
  message: string;
};

/**
 * Rate limit error result
 */
export type CheckinRateLimited = {
  success: false;
  rateLimited: true;
  error: string;
};

/**
 * General error result
 */
export type CheckinError = {
  success: false;
  rateLimited?: false;
  error: string;
};

export type CheckinResult = CheckinSuccess | CheckinRateLimited | CheckinError;

/**
 * Get the filter field for querying activities based on chain type
 */
function getActivityFilter(chain: CheckinChain): string {
  switch (chain) {
    case "evm":
      return "user_wallet_address";
    case "solana":
      return "metadata->>solana_wallet";
    case "stellar":
      return "metadata->>stellar_wallet";
  }
}

/**
 * Build activity metadata based on chain type
 */
function buildActivityMetadata(
  input: CheckinInput,
): Record<string, unknown> {
  const { chain, checkpoint, email, chainWalletAddress, player } = input;

  const base = { checkpoint, email };

  switch (chain) {
    case "evm":
      return base;
    case "solana":
      return {
        ...base,
        chain: "solana",
        solana_wallet: chainWalletAddress,
        player_id: player.id,
      };
    case "stellar":
      return {
        ...base,
        chain: "stellar",
        stellar_wallet: chainWalletAddress,
        player_id: player.id,
      };
  }
}

/**
 * Get chain display name for messages
 */
function getChainDisplayName(chain: CheckinChain): string {
  switch (chain) {
    case "evm":
      return "";
    case "solana":
      return "Solana ";
    case "stellar":
      return "Stellar ";
  }
}

/**
 * Processes a checkpoint checkin for any supported chain.
 * Handles daily limit checking, points awarding, activity insertion, and response building.
 */
export async function processCheckin(input: CheckinInput): Promise<CheckinResult> {
  const { player, checkpoint, chain, chainWalletAddress } = input;
  const { startIso, endIso } = getUtcDayBounds();
  const filterField = getActivityFilter(chain);

  // Check daily checkpoint limit
  const { count: checkpointCheckinsToday, error: checkpointCountError } =
    await supabase
      .from("points_activities")
      .select("id", { count: "exact", head: true })
      .eq(filterField, chainWalletAddress)
      .eq("activity_type", "checkpoint_checkin")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

  if (checkpointCountError) {
    throw checkpointCountError;
  }

  if (
    checkpointCheckinsToday !== null &&
    checkpointCheckinsToday >= DAILY_CHECKPOINT_LIMIT
  ) {
    return {
      success: false,
      rateLimited: true,
      error: `Daily checkpoint limit of ${DAILY_CHECKPOINT_LIMIT} reached. Come back tomorrow!`,
    };
  }

  // Build activity data
  const chainDisplay = getChainDisplayName(chain);
  const activityData: Record<string, unknown> = {
    activity_type: "checkpoint_checkin",
    points_earned: DAILY_CHECKIN_POINTS,
    description: `${chainDisplay}Checkpoint visit: ${checkpoint}`,
    metadata: buildActivityMetadata(input),
    processed: true,
  };

  // Only set user_wallet_address if player has an EVM wallet
  if (player.wallet_address) {
    activityData.user_wallet_address = player.wallet_address;
  }

  // Insert points activity
  const { data: checkpointActivity, error: checkpointActivityError } =
    await supabase
      .from("points_activities")
      .insert(activityData)
      .select()
      .single();

  if (checkpointActivityError) {
    throw checkpointActivityError;
  }

  const checkpointActivityId = checkpointActivity?.id;
  const pointsAwarded = DAILY_CHECKIN_POINTS;

  // Update player points
  let latestPlayer = player;
  if (latestPlayer?.id) {
    latestPlayer = await updatePlayerPoints(latestPlayer.id, pointsAwarded);
  } else if (chain === "evm" && player.wallet_address) {
    // Fallback for EVM: fetch updated profile
    const updatedProfile = await getUserProfile(player.wallet_address);
    if (updatedProfile) {
      latestPlayer = updatedProfile;
    }
  }

  // Calculate today's total points
  const { data: todaysCheckpoints, error: checkpointsSumError } =
    await supabase
      .from("points_activities")
      .select("points_earned")
      .eq(filterField, chainWalletAddress)
      .eq("activity_type", "checkpoint_checkin")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

  if (checkpointsSumError) {
    throw checkpointsSumError;
  }

  const pointsEarnedToday =
    todaysCheckpoints?.reduce(
      (sum, activity) => sum + (activity.points_earned ?? 0),
      0,
    ) ?? pointsAwarded;

  const totalPoints = latestPlayer?.total_points || 0;
  const responsePlayer = latestPlayer
    ? { ...latestPlayer, total_points: totalPoints }
    : { ...player, total_points: totalPoints };

  // Track analytics for all chains using player ID as distinct identifier
  const distinctId = player.id ? String(player.id) : chainWalletAddress;

  trackCheckinCompleted(distinctId, {
    location_id: 0,
    checkpoint,
    points: pointsAwarded,
    checkin_type: "checkpoint",
    chain,
  });

  trackPointsEarned(distinctId, {
    activity_type: "checkpoint_checkin",
    amount: pointsAwarded,
    description: `${chainDisplay}Checkpoint visit: ${checkpoint}`,
    chain,
  });

  return {
    success: true,
    player: responsePlayer,
    pointsAwarded,
    pointsEarnedToday,
    dailyRewardClaimed: pointsEarnedToday > 0,
    checkpointActivityId,
    message: `Nice! You earned ${pointsAwarded} points for this ${chainDisplay}checkpoint.`,
  };
}

/**
 * Extracts error message from unknown error type
 */
export function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  if (typeof e === "string") {
    return e;
  }
  return "Unknown error";
}
