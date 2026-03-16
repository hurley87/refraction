import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { supabase } from '@/lib/db/client';
import {
  updatePlayerPoints,
  getPlayerByWallet,
  createOrUpdatePlayer,
} from '@/lib/db/players';
import {
  STRIPE_COMMONS_NFT_ADDRESS,
  ERC721_TRANSFER_ABI,
  STRIPE_COMMONS_TOTAL_SUPPLY,
  STRIPE_COMMONS_POINTS,
  STRIPE_COMMONS_ACTIVITY_TYPE,
} from '@/lib/contracts/stripe-commons-erc721';

const ERC721_ABI_PARSED = parseAbi(ERC721_TRANSFER_ABI);
const WAIT_FOR_RECEIPT_TIMEOUT_MS = 15_000;
const RECEIPT_POLL_INTERVAL_MS = 1_000;
const PENDING_CLAIM_LOCK_TTL_MS = 5 * 60 * 1000;

const claimLocks = new Map<string, Promise<NextResponse>>();
type PendingClaim = {
  hash: `0x${string}`;
  startedAt: number;
};
const pendingClaims = new Map<string, PendingClaim>();

function getActivePendingClaim(address: string): PendingClaim | null {
  const pending = pendingClaims.get(address);
  if (!pending) return null;

  const ageMs = Date.now() - pending.startedAt;
  if (ageMs > PENDING_CLAIM_LOCK_TTL_MS) {
    pendingClaims.delete(address);
    return null;
  }

  return pending;
}

async function getClaimedTokenIds(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('points_activities')
    .select('metadata')
    .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE);

  if (error) throw error;

  const ids = new Set<number>();
  for (const row of data || []) {
    const tid = row.metadata?.token_id;
    if (typeof tid === 'number') ids.add(tid);
  }
  return ids;
}

async function getNextAvailableTokenId(): Promise<number | null> {
  const claimed = await getClaimedTokenIds();
  for (let id = 1; id <= STRIPE_COMMONS_TOTAL_SUPPLY; id++) {
    if (!claimed.has(id)) return id;
  }
  return null;
}

async function getUserClaimRecord(
  walletAddress: string
): Promise<{ claimed: boolean; tokenId?: number; txHash?: string }> {
  const { data, error } = await supabase
    .from('points_activities')
    .select('metadata')
    .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE)
    .eq('user_wallet_address', walletAddress.toLowerCase())
    .limit(1);

  if (error) throw error;
  if (data && data.length > 0) {
    return {
      claimed: true,
      tokenId: data[0].metadata?.token_id,
      txHash: data[0].metadata?.transaction_hash,
    };
  }
  return { claimed: false };
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

    const normalized = userAddress.toLowerCase();

    if (claimLocks.has(normalized)) {
      return NextResponse.json(
        { success: false, error: 'Claim already in progress' },
        { status: 429 }
      );
    }

    const pendingClaim = getActivePendingClaim(normalized);
    if (pendingClaim) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Claim transaction still pending confirmation for this address. Please wait before retrying.',
          transactionHash: pendingClaim.hash,
        },
        { status: 429 }
      );
    }

    const claimPromise = (async (): Promise<NextResponse> => {
      try {
        return await performClaim(userAddress, normalized);
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : 'Failed to claim artwork';
        console.error('Error in performClaim:', error);
        return NextResponse.json(
          { success: false, error: msg },
          { status: 500 }
        );
      } finally {
        claimLocks.delete(normalized);
      }
    })();

    claimLocks.set(normalized, claimPromise);
    return claimPromise;
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to process claim';
    console.error('Error in POST handler:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function performClaim(
  userAddress: string,
  normalized: string
): Promise<NextResponse> {
  const { claimed } = await getUserClaimRecord(normalized);
  if (claimed) {
    return NextResponse.json(
      { success: false, error: 'You have already claimed your artwork' },
      { status: 400 }
    );
  }

  const tokenId = await getNextAvailableTokenId();
  if (tokenId === null) {
    return NextResponse.json(
      { success: false, error: 'All artwork tokens have been claimed' },
      { status: 400 }
    );
  }

  const privateKey = process.env.SERVER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('SERVER_PRIVATE_KEY not found');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || process.env.BASE_RPC_URL;
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
  });

  const owner = (await publicClient.readContract({
    address: STRIPE_COMMONS_NFT_ADDRESS as `0x${string}`,
    abi: ERC721_ABI_PARSED,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  })) as string;

  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token unavailable – it may have been transferred already',
      },
      { status: 500 }
    );
  }

  let hash: `0x${string}`;
  let receipt: { status: string } | null;
  try {
    hash = await walletClient.writeContract({
      address: STRIPE_COMMONS_NFT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI_PARSED,
      functionName: 'transferFrom',
      args: [
        account.address,
        userAddress as `0x${string}`,
        BigInt(tokenId),
      ],
      account,
    });

    pendingClaims.set(normalized, { hash, startedAt: Date.now() });
    receipt = await waitForReceiptWithTimeout(publicClient, hash);
  } catch (error) {
    pendingClaims.delete(normalized);
    throw error;
  }

  if (!receipt) {
    return NextResponse.json(
      {
        success: true,
        pending: true,
        transactionHash: hash,
        tokenId,
        message:
          'Transaction submitted – waiting for confirmation on Base before awarding points.',
      },
      { status: 202 }
    );
  }

  pendingClaims.delete(normalized);

  if (receipt.status !== 'success') {
    return NextResponse.json(
      { success: false, error: 'On-chain transaction failed' },
      { status: 500 }
    );
  }

  await recordClaim(normalized, tokenId, hash);

  return NextResponse.json({
    success: true,
    transactionHash: hash,
    tokenId,
    pointsAwarded: STRIPE_COMMONS_POINTS,
    message: 'Artwork claimed successfully!',
  });
}

async function recordClaim(
  walletAddress: string,
  tokenId: number,
  txHash: string
) {
  let player = await getPlayerByWallet(walletAddress);
  if (!player) {
    player = await createOrUpdatePlayer({
      wallet_address: walletAddress,
      total_points: 0,
    } as any);
  }

  const { error } = await supabase.from('points_activities').insert({
    activity_type: STRIPE_COMMONS_ACTIVITY_TYPE,
    user_wallet_address: walletAddress,
    points_earned: STRIPE_COMMONS_POINTS,
    description: `Stripe Commons CDMX artwork claim (Token #${tokenId})`,
    metadata: {
      token_id: tokenId,
      transaction_hash: txHash,
      contract_address: STRIPE_COMMONS_NFT_ADDRESS,
      event: 'stripe_commons_cdmx',
    },
    processed: true,
  });
  if (error) throw error;

  if (player?.id) {
    await updatePlayerPoints(player.id, STRIPE_COMMONS_POINTS);
  }
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

    const normalized = userAddress.toLowerCase();

    const record = await getUserClaimRecord(normalized);

    const { count, error: countError } = await supabase
      .from('points_activities')
      .select('id', { count: 'exact', head: true })
      .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE);

    if (countError) throw countError;

    const remaining = STRIPE_COMMONS_TOTAL_SUPPLY - (count || 0);

    return NextResponse.json({
      success: true,
      hasClaimed: record.claimed,
      tokenId: record.tokenId ?? null,
      txHash: record.txHash ?? null,
      canClaim: !record.claimed && remaining > 0,
      remainingTokens: remaining,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to check claim status';
    console.error('Error checking claim status:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'WaitForTransactionReceiptTimeoutError'
    ) {
      console.warn(
        'Transaction confirmation timed out; returning pending state',
        { hash }
      );
      return null;
    }
    throw error;
  }
}
