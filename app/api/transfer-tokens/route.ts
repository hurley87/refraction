import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

// In-memory lock to prevent concurrent transfers for the same user
const transferLocks = new Map<string, Promise<any>>();

// Reward1155 contract address on Base Mainnet
const REWARD1155_ADDRESS = "0x0dF791E915F3A281067521e6267fDC56151f1716";

// ABI for the Reward1155 contract
const REWARD1155_ABI = parseAbi([
  "function rewardToken() external view returns (address)",
  "function rewardAmount() external view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
]);

export async function POST(req: NextRequest) {
  try {
    const { fromAddress, toAddress, amount } = await req.json();

    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "From address, to address, and amount are required",
        },
        { status: 400 },
      );
    }

    // Validate addresses
    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot transfer to the same address",
        },
        { status: 400 },
      );
    }

    // Validate amount
    const transferAmount = BigInt(amount);
    if (transferAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be greater than 0",
        },
        { status: 400 },
      );
    }

    const normalizedFromAddress = fromAddress.toLowerCase();

    // Check if this user already has a transfer in progress
    if (transferLocks.has(normalizedFromAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Transfer already in progress for this address",
        },
        { status: 429 },
      );
    }

    // Create a lock promise for this transfer operation
    const transferPromise = (async () => {
      try {
        return await performTransfer(fromAddress, toAddress, transferAmount);
      } catch (error: any) {
        console.error("Error in performTransfer:", error);
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Failed to transfer tokens",
          },
          { status: 500 },
        );
      } finally {
        transferLocks.delete(normalizedFromAddress);
      }
    })();

    transferLocks.set(normalizedFromAddress, transferPromise);
    return transferPromise;
  } catch (error: any) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process transfer request",
      },
      { status: 500 },
    );
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
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Get the RPC URL from env
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;
  if (!rpcUrl) {
    console.error("NEXT_PUBLIC_BASE_RPC not found in environment");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Create viem clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  // Get the reward token address
  const rewardTokenAddress = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI,
    functionName: "rewardToken",
  });

  if (
    !rewardTokenAddress ||
    rewardTokenAddress === "0x0000000000000000000000000000000000000000"
  ) {
    return NextResponse.json(
      { success: false, error: "No reward token configured" },
      { status: 400 },
    );
  }

  // Check the user's token balance
  const balance = await publicClient.readContract({
    address: rewardTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [fromAddress as `0x${string}`],
  });

  if (balance < amount) {
    return NextResponse.json(
      {
        success: false,
        error: "Insufficient token balance",
        balance: balance.toString(),
        requested: amount.toString(),
      },
      { status: 400 },
    );
  }

  // Transfer tokens from the user to the recipient
  // Note: This requires the server wallet to have approval to spend user's tokens
  // For a proper implementation, the user should sign the transaction themselves
  // This is a simplified version where the server handles the transfer

  // Since we can't transfer on behalf of users without approval,
  // we need to use a different approach - user signs on frontend
  return NextResponse.json(
    {
      success: false,
      error:
        "Direct server transfers not supported. Use client-side signing instead.",
      rewardTokenAddress,
    },
    { status: 501 },
  );
}

// GET endpoint to get token info for transfers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 },
      );
    }

    // Get the RPC URL from env
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;
    if (!rpcUrl) {
      console.error("NEXT_PUBLIC_BASE_RPC not found in environment");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const rewardTokenAddress = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI,
      functionName: "rewardToken",
    });

    if (
      !rewardTokenAddress ||
      rewardTokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return NextResponse.json({
        success: true,
        tokenAddress: null,
        balance: "0",
        decimals: 18,
      });
    }

    const balance = await publicClient.readContract({
      address: rewardTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });

    const decimals = await publicClient.readContract({
      address: rewardTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "decimals",
    });

    return NextResponse.json({
      success: true,
      tokenAddress: rewardTokenAddress,
      balance: balance.toString(),
      decimals: Number(decimals),
    });
  } catch (error: any) {
    console.error("Error fetching token info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch token info",
      },
      { status: 500 },
    );
  }
}
