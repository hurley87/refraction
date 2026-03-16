import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  REWARD1155_ADDRESS,
  REWARD1155_ABI,
  ERC20_ABI,
} from '@/lib/reward1155-abi';
import { verifyWalletOwnership } from '@/lib/api/privy';

// In-memory lock to prevent concurrent mints for the same user
const mintLocks = new Map<string, Promise<any>>();

// When MOCK_CLAIM_NFT_OPEN=true, addresses that "minted" via mock POST (bypasses max supply / contract)
const mockClaimedAddresses = new Set<string>();

// Parse ABIs for viem
const REWARD1155_ABI_PARSED = parseAbi(REWARD1155_ABI);
const ERC20_ABI_PARSED = parseAbi(ERC20_ABI);
const WAIT_FOR_RECEIPT_TIMEOUT_MS = 10_000;
const RECEIPT_POLL_INTERVAL_MS = 1_000;
const PENDING_MINT_LOCK_TTL_MS = 5 * 60 * 1000;

type PendingMint = {
  hash: `0x${string}`;
  startedAt: number;
};

// Keeps users from repeatedly creating new mint txs while a prior tx is still pending.
const pendingMints = new Map<string, PendingMint>();

function getActivePendingMint(address: string): PendingMint | null {
  const pending = pendingMints.get(address);
  if (!pending) return null;

  const ageMs = Date.now() - pending.startedAt;
  if (ageMs > PENDING_MINT_LOCK_TTL_MS) {
    pendingMints.delete(address);
    return null;
  }

  return pending;
}

export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    const auth = await verifyWalletOwnership(req, userAddress);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error ?? 'Unauthorized' },
        { status: 401 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    // Mock bypass: skip contract and max-supply check when MOCK_CLAIM_NFT_OPEN=true
    if (process.env.MOCK_CLAIM_NFT_OPEN === 'true') {
      mockClaimedAddresses.add(normalizedAddress);
      return NextResponse.json({
        success: true,
        transactionHash: `0xmock${Date.now()}${Math.random().toString(16).slice(2)}`,
        nftBalance: '1',
        tokenBalance: '100',
        rewardAmount: '100',
        message: 'NFT claimed successfully! 🎉 (mock)',
      });
    }

    // Check if this user is already minting
    if (mintLocks.has(normalizedAddress)) {
      return NextResponse.json(
        { success: false, error: 'Mint already in progress for this address' },
        { status: 429 }
      );
    }

    const pendingMint = getActivePendingMint(normalizedAddress);
    if (pendingMint) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Mint transaction still pending confirmation for this address. Please wait before retrying.',
          transactionHash: pendingMint.hash,
        },
        { status: 429 }
      );
    }

    // Create a lock promise for this mint operation
    const mintPromise = (async () => {
      try {
        return await performMint(userAddress, normalizedAddress);
      } catch (error: any) {
        // Handle errors from performMint and return proper error response
        console.error('Error in performMint:', error);
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Failed to mint NFT',
          },
          { status: 500 }
        );
      } finally {
        // Always remove the lock when done
        mintLocks.delete(normalizedAddress);
      }
    })();

    mintLocks.set(normalizedAddress, mintPromise);
    return mintPromise;
  } catch (error: any) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process mint request',
      },
      { status: 500 }
    );
  }
}

async function performMint(userAddress: string, normalizedAddress: string) {
  // Get the private key from env
  const privateKey = process.env.SERVER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('SERVER_PRIVATE_KEY not found in environment');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
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
    functionName: 'canMint',
    args: [userAddress as `0x${string}`],
  });

  if (!canMint) {
    // Check if already minted
    const hasMinted = await publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: 'hasMinted',
      args: [userAddress as `0x${string}`],
    });

    if (hasMinted) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already claimed your NFT',
          alreadyClaimed: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Max supply reached or cannot mint' },
      { status: 400 }
    );
  }

  // Mint the NFT for the user using mintTo function
  let hash: `0x${string}` | null = null;
  try {
    hash = await walletClient.writeContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: 'mintTo',
      args: [userAddress as `0x${string}`],
      account,
    });

    pendingMints.set(normalizedAddress, { hash, startedAt: Date.now() });

    // Wait for transaction confirmation, but cap at Vercel timeout window
    const receipt = await waitForReceiptWithTimeout(publicClient, hash);

    if (!receipt) {
      return NextResponse.json(
        {
          success: true,
          pending: true,
          transactionHash: hash,
          message:
            'Transaction submitted. Waiting for confirmation on Base before finalizing your claim.',
        },
        { status: 202 }
      );
    }

    pendingMints.delete(normalizedAddress);

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Transaction failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    pendingMints.delete(normalizedAddress);
    throw error;
  }

  // Get updated balances for the user
  const [nftBalance, rewardTokenAddress, rewardAmount] = await Promise.all([
    publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`, BigInt(1)], // TOKEN_ID is 1
    }),
    publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: 'rewardToken',
    }),
    publicClient.readContract({
      address: REWARD1155_ADDRESS as `0x${string}`,
      abi: REWARD1155_ABI_PARSED,
      functionName: 'rewardAmount',
    }),
  ]);

  let tokenBalance = '0';
  if (
    rewardTokenAddress &&
    rewardTokenAddress !== '0x0000000000000000000000000000000000000000'
  ) {
    tokenBalance = (
      await publicClient.readContract({
        address: rewardTokenAddress as `0x${string}`,
        abi: ERC20_ABI_PARSED,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      })
    ).toString();
  }

  return NextResponse.json({
    success: true,
    transactionHash: hash!,
    nftBalance: nftBalance.toString(),
    tokenBalance: tokenBalance.toString(),
    rewardAmount: rewardAmount.toString(),
    message: 'NFT claimed successfully! 🎉',
  });
}

// GET endpoint to check if user has claimed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    const auth = await verifyWalletOwnership(req, userAddress);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error ?? 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optional: mock "mint open" for local testing (set MOCK_CLAIM_NFT_OPEN=true in .env.local)
    if (process.env.MOCK_CLAIM_NFT_OPEN === 'true') {
      const normalized = userAddress.toLowerCase();
      const hasClaimed = mockClaimedAddresses.has(normalized);
      return NextResponse.json({
        success: true,
        hasClaimed,
        nftBalance: hasClaimed ? '1' : '0',
        tokenBalance: hasClaimed ? '100' : '0',
        canMint: !hasClaimed,
      });
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
    });

    const [hasMinted, canMint, nftBalance, rewardTokenAddress] =
      await Promise.all([
        publicClient.readContract({
          address: REWARD1155_ADDRESS as `0x${string}`,
          abi: REWARD1155_ABI_PARSED,
          functionName: 'hasMinted',
          args: [userAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: REWARD1155_ADDRESS as `0x${string}`,
          abi: REWARD1155_ABI_PARSED,
          functionName: 'canMint',
          args: [userAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: REWARD1155_ADDRESS as `0x${string}`,
          abi: REWARD1155_ABI_PARSED,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`, BigInt(1)],
        }),
        publicClient.readContract({
          address: REWARD1155_ADDRESS as `0x${string}`,
          abi: REWARD1155_ABI_PARSED,
          functionName: 'rewardToken',
        }),
      ]);

    if (hasMinted) {
      pendingMints.delete(userAddress.toLowerCase());
    }

    let tokenBalance = '0';
    if (
      rewardTokenAddress &&
      rewardTokenAddress !== '0x0000000000000000000000000000000000000000'
    ) {
      tokenBalance = (
        await publicClient.readContract({
          address: rewardTokenAddress as `0x${string}`,
          abi: ERC20_ABI_PARSED,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        })
      ).toString();
    }

    return NextResponse.json({
      success: true,
      hasClaimed: hasMinted,
      nftBalance: nftBalance.toString(),
      tokenBalance,
      canMint: canMint,
    });
  } catch (error: any) {
    console.error('Error checking mint status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check mint status',
      },
      { status: 500 }
    );
  }
}

async function waitForReceiptWithTimeout(
  publicClient: {
    waitForTransactionReceipt: (args: {
      hash: `0x${string}`;
      timeout?: number;
      pollingInterval?: number;
    }) => Promise<any>;
  },
  hash: `0x${string}`
) {
  try {
    return await publicClient.waitForTransactionReceipt({
      hash,
      timeout: WAIT_FOR_RECEIPT_TIMEOUT_MS,
      pollingInterval: RECEIPT_POLL_INTERVAL_MS,
    });
  } catch (error: any) {
    if (error?.name === 'WaitForTransactionReceiptTimeoutError') {
      console.warn(
        'Transaction confirmation timed out; returning pending state',
        { hash }
      );
      return null;
    }
    throw error;
  }
}
