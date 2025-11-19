import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { REWARD1155_ADDRESS, REWARD1155_ABI, ERC20_ABI } from "@/lib/reward1155-abi";

// In-memory lock to prevent concurrent mints for the same user
const mintLocks = new Map<string, Promise<any>>();

// Parse ABIs for viem
const REWARD1155_ABI_PARSED = parseAbi(REWARD1155_ABI);
const ERC20_ABI_PARSED = parseAbi(ERC20_ABI);

export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 },
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    // Check if this user is already minting
    if (mintLocks.has(normalizedAddress)) {
      return NextResponse.json(
        { success: false, error: "Mint already in progress for this address" },
        { status: 429 },
      );
    }

    // Create a lock promise for this mint operation
    const mintPromise = (async () => {
      try {
        return await performMint(userAddress);
      } catch (error: any) {
        // Handle errors from performMint and return proper error response
        console.error("Error in performMint:", error);
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Failed to mint NFT",
          },
          { status: 500 },
        );
      } finally {
        // Always remove the lock when done
        mintLocks.delete(normalizedAddress);
      }
    })();

    mintLocks.set(normalizedAddress, mintPromise);
    return mintPromise;
  } catch (error: any) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process mint request",
      },
      { status: 500 },
    );
  }
}

async function performMint(userAddress: string) {
  // Get the private key from env
  const privateKey = process.env.SERVER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("SERVER_PRIVATE_KEY not found in environment");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Create viem clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
  });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
  });

  // Check if user can mint
  const canMint = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "canMint",
    args: [userAddress as `0x${string}`],
  });

  if (!canMint) {
    // Check if already minted
    const hasMinted = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: "hasMinted",
      args: [userAddress as `0x${string}`],
    });

    if (hasMinted) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already claimed your NFT",
          alreadyClaimed: true,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Max supply reached or cannot mint" },
      { status: 400 },
    );
  }

  // Mint the NFT for the user using mintTo function
  const hash = await walletClient.writeContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "mintTo",
    args: [userAddress as `0x${string}`],
    account,
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    return NextResponse.json(
      { success: false, error: "Transaction failed" },
      { status: 500 },
    );
  }

  // Get updated balances for the user
  const nftBalance = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`, BigInt(1)], // TOKEN_ID is 1
  });

  const rewardTokenAddress = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "rewardToken",
  });

  const rewardAmount = await publicClient.readContract({
    address: REWARD1155_ADDRESS as `0x${string}`,
    abi: REWARD1155_ABI_PARSED,
    functionName: "rewardAmount",
  });

  let tokenBalance = "0";
  if (
    rewardTokenAddress &&
    rewardTokenAddress !== "0x0000000000000000000000000000000000000000"
  ) {
    tokenBalance = (
      await publicClient.readContract({
        address: rewardTokenAddress as `0x${string}`,
        abi: ERC20_ABI_PARSED,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      })
    ).toString();
  }

  return NextResponse.json({
    success: true,
    transactionHash: hash,
    nftBalance: nftBalance.toString(),
    tokenBalance: tokenBalance.toString(),
    rewardAmount: rewardAmount.toString(),
    message: "NFT claimed successfully! 🎉",
  });
}

// GET endpoint to check if user has claimed
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

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
    });

    const hasMinted = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: "hasMinted",
      args: [userAddress as `0x${string}`],
    });

    const nftBalance = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`, BigInt(1)],
    });

    const rewardTokenAddress = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: "rewardToken",
    });

    let tokenBalance = "0";
    if (
      rewardTokenAddress &&
      rewardTokenAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      tokenBalance = (
        await publicClient.readContract({
          address: rewardTokenAddress as `0x${string}`,
          abi: ERC20_ABI_PARSED,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
        })
      ).toString();
    }

    return NextResponse.json({
      success: true,
      hasClaimed: hasMinted,
      nftBalance: nftBalance.toString(),
      tokenBalance,
      canMint: !hasMinted,
    });
  } catch (error: any) {
    console.error("Error checking mint status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check mint status",
      },
      { status: 500 },
    );
  }
}
