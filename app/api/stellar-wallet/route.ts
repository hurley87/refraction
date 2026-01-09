import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createOrUpdatePlayerForStellar, getPlayerByEmail } from "@/lib/db/players";
import { apiSuccess, apiError } from "@/lib/api/response";

// Lazy initialization to ensure env vars are loaded
let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    // Debug logging
    console.log(
      "Privy App ID:",
      appId ? `${appId.substring(0, 8)}...` : "MISSING",
    );
    console.log(
      "Privy App Secret:",
      appSecret ? `${appSecret.substring(0, 8)}...` : "MISSING",
    );

    if (!appId || !appSecret) {
      throw new Error(
        "Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables",
      );
    }

    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

/**
 * GET - Get Stellar wallet for a user
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const privyUserId = searchParams.get("privyUserId");

  if (!privyUserId) {
    return apiError("Privy user ID is required", 400);
  }

  try {
    const privy = getPrivyClient();

    // Get user's wallets from Privy
    const user = await privy.getUser(privyUserId);

    // Find Stellar wallet in linked accounts (for Tier 1 wallets)
    const stellarWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === "wallet" &&
        "chainType" in account &&
        account.chainType === "stellar",
    );

    if (stellarWallet && "address" in stellarWallet) {
      return apiSuccess({
        address: stellarWallet.address,
        walletId: "id" in stellarWallet ? stellarWallet.id : undefined,
      });
    }

    // For Tier 2 server-managed wallets, check the database via user's email
    const email = user.email?.address;
    if (email) {
      const player = await getPlayerByEmail(email);
      if (player?.stellar_wallet_address) {
        return apiSuccess({
          address: player.stellar_wallet_address,
          walletId: player.stellar_wallet_id ?? undefined,
        });
      }
    }

    return apiSuccess({ address: null });
  } catch (error) {
    console.error("Error fetching Stellar wallet:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch wallet",
      500,
    );
  }
}

/**
 * POST - Create Stellar wallet for a user
 */
export async function POST(req: NextRequest) {
  const { privyUserId } = await req.json();

  if (!privyUserId) {
    return apiError("Privy user ID is required", 400);
  }

  try {
    const privy = getPrivyClient();

    // Check if user already has a Stellar wallet
    const user = await privy.getUser(privyUserId);
    const existingStellarWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === "wallet" &&
        "chainType" in account &&
        account.chainType === "stellar",
    );

    if (existingStellarWallet && "address" in existingStellarWallet) {
      // Ensure wallet is saved to database (in case it wasn't previously)
      const email = user.email?.address ?? undefined;
      const walletId =
        "id" in existingStellarWallet ? existingStellarWallet.id : undefined;
      await createOrUpdatePlayerForStellar(
        existingStellarWallet.address,
        email,
        walletId ?? undefined,
      );

      return apiSuccess(
        {
          address: existingStellarWallet.address,
          walletId:
            "id" in existingStellarWallet
              ? existingStellarWallet.id
              : undefined,
        },
        "Stellar wallet already exists",
      );
    }

    // Create a new Stellar wallet (Tier 2 - server-managed)
    // Note: Stellar wallets are created server-side without direct user ownership
    // The wallet address is stored in our database linked to the user
    const wallet = await privy.walletApi.create({
      chainType: "stellar",
    });

    // Get user's email for account linking
    const email = user.email?.address ?? undefined;

    // Save to database (creates player or links wallet to existing player by email)
    await createOrUpdatePlayerForStellar(wallet.address, email, wallet.id);

    return apiSuccess(
      {
        address: wallet.address,
        walletId: wallet.id,
      },
      "Stellar wallet created successfully",
    );
  } catch (error) {
    console.error("Error creating Stellar wallet:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to create wallet",
      500,
    );
  }
}
