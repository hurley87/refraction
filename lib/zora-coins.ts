import { createCoin } from "@zoralabs/coins-sdk";
import {
  createWalletClient,
  custom,
  createPublicClient,
  http,
  type Address,
} from "viem";
import { base } from "viem/chains";

interface CreateLocationCoinParams {
  locationName: string;
  locationDescription: string;
  creatorAddress: string;
  ethereum: any; // MetaMask or wallet provider
}

interface CreateLocationCoinResult {
  success: boolean;
  coinAddress?: string;
  transactionHash?: string;
  error?: string;
}

export async function createLocationCoin({
  locationName,
  creatorAddress,
  ethereum,
}: CreateLocationCoinParams): Promise<CreateLocationCoinResult> {
  try {
    // Create public client for reading
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Create wallet client for transactions
    const walletClient = createWalletClient({
      chain: base,
      transport: custom(ethereum),
      account: creatorAddress as `0x${string}`,
    });

    // Prepare coin args per SDK docs
    const coinName = `${locationName} Coin`;
    const coinSymbol = generateCoinSymbol(locationName);
    const callArgs = {
      creator: creatorAddress as Address,
      name: coinName,
      symbol: coinSymbol,
      metadata: { type: "RAW_URI" as const, uri: "ipfs://placeholder" },
      currency: "ETH" as const,

      chainId: base.id,
      startingMarketCap: "LOW" as const,
    };

    // High-level helper: sends tx and waits for receipt
    const result = await createCoin({
      call: callArgs,
      walletClient,
      publicClient,
    });
    const hash = result.hash;

    console.log("Coin creation transaction hash:", hash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("Transaction confirmed:", receipt);

    // Extract coin address from logs
    const coinAddress = extractCoinAddressFromLogs(receipt.logs);

    if (!coinAddress) {
      throw new Error("Failed to extract coin address from transaction logs");
    }

    return {
      success: true,
      coinAddress,
      transactionHash: hash,
    };
  } catch (error) {
    console.error("Error creating location coin:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error creating coin",
    };
  }
}

// Generate a coin symbol from location name
function generateCoinSymbol(locationName: string): string {
  // Remove special characters and spaces, take first 4 characters, add LOC suffix
  const cleaned = locationName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = cleaned.slice(0, 4).padEnd(4, "X"); // Ensure 4 chars minimum
  return `${prefix}LOC`; // e.g., "NYCLOC" for New York City
}

// Extract coin address from transaction logs
function extractCoinAddressFromLogs(logs: any[]): string | null {
  try {
    // Look for the coin creation event in transaction logs
    // This depends on Zora's contract event structure
    for (const log of logs) {
      if (log.topics && log.topics.length > 0) {
        // The coin address might be in the log data or topics
        // This is a simplified version - you may need to decode the actual event
        if (log.address && log.address.startsWith("0x")) {
          return log.address;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error extracting coin address from logs:", error);
    return null;
  }
}

// Get coin information
export async function getCoinInfo(coinAddress: string) {
  try {
    return { address: coinAddress };
  } catch (error) {
    console.error("Error getting coin info:", error);
    return null;
  }
}

// Mint coins for location check-ins (bonus feature)
export async function mintLocationCoins({
  coinAddress,
}: {
  coinAddress: string;
}): Promise<CreateLocationCoinResult> {
  try {
    // Placeholder until ABI/mint wired up
    return { success: true, coinAddress };
  } catch (error) {
    console.error("Error minting location coins:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error minting coins",
    };
  }
}
