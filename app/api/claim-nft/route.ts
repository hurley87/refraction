import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { WALLETCON_NFT_ADDRESS, WALLETCON_NFT_ABI } from '@/lib/walletcon-nft';
import { ERC20_ABI } from '@/lib/reward1155-abi';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { getServerPrivateKey } from '@/lib/server-private-key';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';

// In-memory lock to prevent concurrent mints for the same user
const mintLocks = new Map<string, Promise<any>>();

// When MOCK_CLAIM_NFT_OPEN=true, addresses that "minted" via mock POST (bypasses max supply / contract)
const mockClaimedAddresses = new Set<string>();

const NFT_ABI_PARSED = parseAbi(WALLETCON_NFT_ABI);
const ERC20_ABI_PARSED = parseAbi(ERC20_ABI);
const WAIT_FOR_RECEIPT_TIMEOUT_MS = 10_000;
const RECEIPT_POLL_INTERVAL_MS = 1_000;
const PENDING_MINT_LOCK_TTL_MS = 5 * 60 * 1000;
const ZERO_BIGINT = BigInt(0);

type PendingMint = {
  hash: `0x${string}`;
  startedAt: number;
};

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

    if (process.env.MOCK_CLAIM_NFT_OPEN === 'true') {
      mockClaimedAddresses.add(normalizedAddress);
      return NextResponse.json({
        success: true,
        transactionHash: `0xmock${Date.now()}${Math.random().toString(16).slice(2)}`,
        nftBalance: '1',
        tokenBalance: '5000000',
        rewardAmount: '5000000',
        message: 'NFT claimed successfully! 🎉 (mock)',
      });
    }

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

    const mintPromise = (async () => {
      try {
        return await performMint(userAddress, normalizedAddress);
      } catch (error: any) {
        console.error('Error in performMint:', error);
        captureHandledException(error, {
          route: '/api/claim-nft',
          operation: 'mint_claim',
          statusCode: 500,
          extra: {
            normalizedAddress,
          },
        });
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Failed to mint NFT',
          },
          { status: 500 }
        );
      } finally {
        mintLocks.delete(normalizedAddress);
      }
    })();

    mintLocks.set(normalizedAddress, mintPromise);
    return mintPromise;
  } catch (error: any) {
    console.error('Error in POST handler:', error);
    captureHandledException(error, {
      route: '/api/claim-nft',
      operation: 'post_request',
      statusCode: 500,
    });
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
  const privateKey = getServerPrivateKey();
  if (!privateKey) {
    console.error(
      '[claim-nft] No server wallet key: set SERVER_PRIVATE_KEY or SERVER_WALLET_PRIVATE_KEY in .env.local (Base wallet with ETH for gas; must be NFT contract owner).'
    );
    captureHandledException(
      new Error('Missing server wallet key for /api/claim-nft mint execution.'),
      {
        route: '/api/claim-nft',
        operation: 'missing_server_wallet_key',
        statusCode: 500,
      }
    );
    return NextResponse.json(
      {
        success: false,
        error:
          'Mint is not configured: add SERVER_PRIVATE_KEY or SERVER_WALLET_PRIVATE_KEY to your environment (Base wallet funded with ETH for gas).',
      },
      { status: 500 }
    );
  }

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

  const addr = userAddress as `0x${string}`;

  const [nftBalance, totalMinted, maxSupply, mintReward, contractUsdcBalance] =
    await Promise.all([
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'balanceOf',
        args: [addr],
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'totalMinted',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'maxSupply',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'mintReward',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'usdcBalance',
      }),
    ]);

  if (nftBalance > ZERO_BIGINT) {
    return NextResponse.json(
      {
        success: false,
        error: 'You have already claimed your NFT',
        alreadyClaimed: true,
      },
      { status: 400 }
    );
  }

  if (totalMinted >= maxSupply) {
    return NextResponse.json(
      { success: false, error: 'Max supply reached or cannot mint' },
      { status: 400 }
    );
  }

  if (mintReward > ZERO_BIGINT && contractUsdcBalance < mintReward) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Reward pool is temporarily insufficient. Please try again later.',
      },
      { status: 503 }
    );
  }

  let hash: `0x${string}` | null = null;
  try {
    hash = await walletClient.writeContract({
      address: WALLETCON_NFT_ADDRESS,
      abi: NFT_ABI_PARSED,
      functionName: 'mint',
      args: [addr],
      account,
    });

    pendingMints.set(normalizedAddress, { hash, startedAt: Date.now() });

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

  const usdcAddress = await publicClient.readContract({
    address: WALLETCON_NFT_ADDRESS,
    abi: NFT_ABI_PARSED,
    functionName: 'usdc',
  });

  const [nftBalanceAfter, userUsdcBalance] = await Promise.all([
    publicClient.readContract({
      address: WALLETCON_NFT_ADDRESS,
      abi: NFT_ABI_PARSED,
      functionName: 'balanceOf',
      args: [addr],
    }),
    usdcAddress && usdcAddress !== '0x0000000000000000000000000000000000000000'
      ? publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI_PARSED,
          functionName: 'balanceOf',
          args: [addr],
        })
      : Promise.resolve(ZERO_BIGINT),
  ]);

  return NextResponse.json({
    success: true,
    transactionHash: hash!,
    nftBalance: nftBalanceAfter.toString(),
    tokenBalance: userUsdcBalance.toString(),
    rewardAmount: mintReward.toString(),
    message: 'NFT claimed successfully! 🎉',
  });
}

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

    if (process.env.MOCK_CLAIM_NFT_OPEN === 'true') {
      const normalized = userAddress.toLowerCase();
      const hasClaimed = mockClaimedAddresses.has(normalized);
      return NextResponse.json({
        success: true,
        hasClaimed,
        nftBalance: hasClaimed ? '1' : '0',
        tokenBalance: hasClaimed ? '5000000' : '0',
        canMint: !hasClaimed,
      });
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC),
    });

    const wallet = userAddress as `0x${string}`;

    const [
      nftBalance,
      totalMinted,
      maxSupply,
      mintReward,
      contractUsdcBalance,
      usdcAddress,
    ] = await Promise.all([
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'balanceOf',
        args: [wallet],
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'totalMinted',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'maxSupply',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'mintReward',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'usdcBalance',
      }),
      publicClient.readContract({
        address: WALLETCON_NFT_ADDRESS,
        abi: NFT_ABI_PARSED,
        functionName: 'usdc',
      }),
    ]);

    const hasClaimed = nftBalance > ZERO_BIGINT;
    if (hasClaimed) {
      pendingMints.delete(userAddress.toLowerCase());
    }

    const canMint =
      !hasClaimed &&
      totalMinted < maxSupply &&
      (mintReward === ZERO_BIGINT || contractUsdcBalance >= mintReward);

    let tokenBalance = '0';
    if (
      usdcAddress &&
      usdcAddress !== '0x0000000000000000000000000000000000000000'
    ) {
      tokenBalance = (
        await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI_PARSED,
          functionName: 'balanceOf',
          args: [wallet],
        })
      ).toString();
    }

    return NextResponse.json({
      success: true,
      hasClaimed,
      nftBalance: nftBalance.toString(),
      tokenBalance,
      canMint,
    });
  } catch (error: any) {
    console.error('Error checking mint status:', error);
    captureHandledException(error, {
      route: '/api/claim-nft',
      operation: 'get_claim_status',
      statusCode: 500,
    });
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
