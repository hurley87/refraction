import { NextRequest } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { REWARD1155_ADDRESS, REWARD1155_ABI, ERC20_ABI } from "@/lib/reward1155-abi";
import { apiSuccess, apiError } from "@/lib/api/response";

// In-memory lock to prevent concurrent transfers for the same user
const transferLocks = new Map<string, Promise<any>>();

// Parse ABIs for viem
const REWARD1155_ABI_PARSED = parseAbi(REWARD1155_ABI);
const ERC20_ABI_PARSED = parseAbi(ERC20_ABI);

export async function POST(req: NextRequest) {
  try {
    const { fromAddress, toAddress, amount } = await req.json();

    if (!fromAddress || !toAddress || !amount) {
      return apiError("From address, to address, and amount are required", 400);
    }

    // Validate addresses
    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      return apiError("Cannot transfer to the same address", 400);
    }

    // Validate amount
    const transferAmount = BigInt(amount);
    if (transferAmount <= 0) {
      return apiError("Amount must be greater than 0", 400);
    }

    const normalizedFromAddress = fromAddress.toLowerCase();

    // Check if this user already has a transfer in progress
    if (transferLocks.has(normalizedFromAddress)) {
      return apiError("Transfer already in progress for this address", 429);
    }

    // Create a lock promise for this transfer operation
    const transferPromise = (async () => {
      try {
        return await performTransfer(fromAddress, toAddress, transferAmount);
      } catch (error: unknown) {
        console.error("Error in performTransfer:", error);
        const message = error instanceof Error ? error.message : "Failed to transfer tokens";
        return apiError(message, 500);
      } finally {
        transferLocks.delete(normalizedFromAddress);
      }
    })();

    transferLocks.set(normalizedFromAddress, transferPromise);
    return transferPromise;
  } catch (error: unknown) {
    console.error("Error in POST handler:", error);
    const message = error instanceof Error ? error.message : "Failed to process transfer request";
    return apiError(message, 500);
  }
}

async function performTransfer(
  fromAddress: string,
  toAddress: string,
  amount: bigint,
) {
  // Get the private key from env
  const privateKey = process.env.SERVER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("SERVER_PRIVATE_KEY not found in environment");
    return apiError("Server configuration error", 500);
  }

  // Get the RPC URL from env
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;
  if (!rpcUrl) {
    console.error("NEXT_PUBLIC_BASE_RPC not found in environment");
    return apiError("Server configuration error", 500);
  }

  // Create viem clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  // Get the reward token address
  const rewardTokenAddress = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "rewardToken",
  });

  if (
    !rewardTokenAddress ||
    rewardTokenAddress === "0x0000000000000000000000000000000000000000"
  ) {
    return apiError("No reward token configured", 400);
  }

  // Check the user's token balance
  const balance = await publicClient.readContract({
    address: rewardTokenAddress as `0x${string}`,
    abi: ERC20_ABI_PARSED,
    functionName: "balanceOf",
    args: [fromAddress as `0x${string}`],
  });

  if (balance < amount) {
    return apiError("Insufficient token balance", 400);
  }

  // Transfer tokens from the user to the recipient
  // Note: This requires the server wallet to have approval to spend user's tokens
  // For a proper implementation, the user should sign the transaction themselves
  // This is a simplified version where the server handles the transfer

  // Since we can't transfer on behalf of users without approval,
  // we need to use a different approach - user signs on frontend
  return apiError("Direct server transfers not supported. Use client-side signing instead.", 500);
}

// GET endpoint to get token info for transfers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return apiError("User address is required", 400);
    }

    // Get the RPC URL from env
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;
    if (!rpcUrl) {
      console.error("NEXT_PUBLIC_BASE_RPC not found in environment");
      return apiError("Server configuration error", 500);
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const rewardTokenAddress = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: "rewardToken",
    });

    if (
      !rewardTokenAddress ||
      rewardTokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return apiSuccess({
        tokenAddress: null,
        balance: "0",
        decimals: 18,
      });
    }

    const balance = await publicClient.readContract({
      address: rewardTokenAddress as `0x${string}`,
      abi: ERC20_ABI_PARSED,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });

    const decimals = await publicClient.readContract({
      address: rewardTokenAddress as `0x${string}`,
      abi: ERC20_ABI_PARSED,
      functionName: "decimals",
    });

    return apiSuccess({
      tokenAddress: rewardTokenAddress,
      balance: balance.toString(),
      decimals: Number(decimals),
    });
  } catch (error: unknown) {
    console.error("Error fetching token info:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch token info";
    return apiError(message, 500);
  }
}
