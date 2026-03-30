import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { getServerPrivateKey } from '@/lib/server-private-key';
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
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';
const RECEIPT_POLL_INTERVAL_MS = 1_000;
const PENDING_CLAIM_LOCK_TTL_MS = 5 * 60 * 1000;

const claimLocks = new Map<string, Promise<NextResponse>>();
type PendingClaim = {
  hash: `0x${string}`;
  tokenId: number;
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

async function getNextTransferableTokenId(
  publicClient: {
    readContract: (args: {
      address: `0x${string}`;
      abi: typeof ERC721_ABI_PARSED;
      functionName: 'ownerOf';
      args: [bigint];
    }) => Promise<unknown>;
  },
  distributorAddress: string
): Promise<number | null> {
  const claimed = await getClaimedTokenIds();
  const normalizedDistributor = distributorAddress.toLowerCase();

  for (let id = 1; id <= STRIPE_COMMONS_TOTAL_SUPPLY; id++) {
    if (claimed.has(id)) continue;

    try {
      const owner = (await publicClient.readContract({
        address: STRIPE_COMMONS_NFT_ADDRESS as `0x${string}`,
        abi: ERC721_ABI_PARSED,
        functionName: 'ownerOf',
        args: [BigInt(id)],
      })) as string;

      if (owner.toLowerCase() === normalizedDistributor) {
        return id;
      }
    } catch (error) {
      console.warn('[stripe-commons] Failed to inspect token ownership', {
        tokenId: id,
        error,
      });
    }
  }

  return null;
}

async function getUserClaimRecord(walletAddress: string): Promise<{
  claimed: boolean;
  tokenId?: number;
  txHash?: string;
  imageUrl?: string;
}> {
  const { data, error } = await supabase
    .from('points_activities')
    .select('metadata')
    .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE)
    .eq('user_wallet_address', walletAddress.toLowerCase())
    .limit(1);

  if (error) throw error;
  if (data && data.length > 0) {
    const metadata = data[0].metadata || {};
    // Debug: inspect stored metadata and any image URL fields
    console.log(
      '[stripe-commons] claim metadata for wallet',
      walletAddress,
      metadata
    );
    const imageUrl =
      metadata.image_url || metadata.image || metadata.token_image || null;
    return {
      claimed: true,
      tokenId: metadata.token_id,
      txHash: metadata.transaction_hash,
      imageUrl: imageUrl ?? undefined,
    };
  }
  return { claimed: false };
}

/**
 * Resolve NFT image URL from the collection contract: tokenURI(tokenId) → IPFS
 * metadata JSON → image field. Returns a gateway URL suitable for <img> / Next Image.
 */
async function getTokenImageUrl(tokenId: number): Promise<string | null> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    console.warn('[stripe-commons] No Base RPC URL for tokenURI');
    return null;
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  let tokenUri: string;
  try {
    tokenUri = (await publicClient.readContract({
      address: STRIPE_COMMONS_NFT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI_PARSED,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    })) as string;
  } catch (e) {
    console.warn('[stripe-commons] tokenURI failed for tokenId', tokenId, e);
    return null;
  }

  if (!tokenUri || typeof tokenUri !== 'string') return null;

  const metadataUrl = tokenUri.startsWith('ipfs://')
    ? `${IPFS_GATEWAY}/${tokenUri.slice(7)}`
    : tokenUri;

  let res: Response;
  try {
    res = await fetch(metadataUrl);
  } catch (e) {
    console.warn('[stripe-commons] Fetch metadata failed', metadataUrl, e);
    return null;
  }

  if (!res.ok) return null;

  let metadata: { image?: string; image_url?: string };
  try {
    metadata = await res.json();
  } catch {
    return null;
  }

  const imageRef = metadata.image ?? metadata.image_url ?? null;
  if (!imageRef || typeof imageRef !== 'string') return null;

  if (imageRef.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}/${imageRef.slice(7)}`;
  }
  return imageRef;
}

type PendingClaimResolution = 'pending' | 'confirmed' | 'failed';

async function resolvePendingClaimIfSettled(
  normalized: string,
  pendingClaim: PendingClaim
): Promise<PendingClaimResolution> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || process.env.BASE_RPC_URL;
  if (!rpcUrl) return 'pending';

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const receipt = await waitForReceiptWithTimeout(
    publicClient,
    pendingClaim.hash,
    1_500
  );

  if (!receipt) {
    return 'pending';
  }

  pendingClaims.delete(normalized);

  if (receipt.status !== 'success') {
    return 'failed';
  }

  const existingRecord = await getUserClaimRecord(normalized);
  if (!existingRecord.claimed) {
    await recordClaim(normalized, pendingClaim.tokenId, pendingClaim.hash);
  }

  return 'confirmed';
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
      const pendingResolution = await resolvePendingClaimIfSettled(
        normalized,
        pendingClaim
      );

      if (pendingResolution === 'confirmed') {
        return NextResponse.json({
          success: true,
          recoveredPendingClaim: true,
          transactionHash: pendingClaim.hash,
          tokenId: pendingClaim.tokenId,
          pointsAwarded: STRIPE_COMMONS_POINTS,
          message: 'Artwork claim confirmed successfully!',
        });
      }

      if (pendingResolution === 'failed') {
        pendingClaims.delete(normalized);
      }

      if (pendingResolution === 'pending') {
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

  const privateKey = getServerPrivateKey();
  if (!privateKey) {
    console.error(
      'No server wallet key: set SERVER_PRIVATE_KEY or SERVER_WALLET_PRIVATE_KEY'
    );
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

  const tokenId = await getNextTransferableTokenId(
    publicClient,
    account.address
  );
  if (tokenId === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'All artwork tokens have been claimed',
      },
      { status: 400 }
    );
  }

  let hash: `0x${string}`;
  let receipt: { status: string } | null;
  try {
    hash = await walletClient.writeContract({
      address: STRIPE_COMMONS_NFT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI_PARSED,
      functionName: 'transferFrom',
      args: [account.address, userAddress as `0x${string}`, BigInt(tokenId)],
      account,
    });

    pendingClaims.set(normalized, { hash, tokenId, startedAt: Date.now() });
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

    let imageUrl: string | null = null;
    if (record.claimed && record.tokenId != null) {
      try {
        imageUrl = await getTokenImageUrl(record.tokenId);
      } catch (e) {
        console.warn('[stripe-commons] getTokenImageUrl failed', e);
      }
      if (!imageUrl) imageUrl = record.imageUrl ?? null;
    }

    return NextResponse.json({
      success: true,
      hasClaimed: record.claimed,
      tokenId: record.tokenId ?? null,
      txHash: record.txHash ?? null,
      imageUrl,
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
  hash: `0x${string}`,
  timeoutMs: number = WAIT_FOR_RECEIPT_TIMEOUT_MS
) {
  try {
    return await publicClient.waitForTransactionReceipt({
      hash,
      timeout: timeoutMs,
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
