import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import type { SpendServerWalletMetadata } from '@/lib/spend-server-wallet';

// Lazy-initialized singleton shared across all API routes
let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables'
      );
    }

    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

/**
 * Verify the Privy auth token from the Authorization header and confirm
 * the authenticated user matches the requested privyUserId.
 */
export async function verifyCallerIdentity(
  req: NextRequest,
  privyUserId: string
): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);

    if (verifiedClaims.userId !== privyUserId) {
      return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true };
  } catch {
    return { authorized: false, error: 'Invalid or expired token' };
  }
}

/**
 * Return the Privy `userId` for a valid Bearer token, or null.
 */
export async function getPrivyUserIdFromRequest(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims.userId;
  } catch {
    return null;
  }
}

/**
 * Verify the caller is authenticated with Privy and owns the provided wallet.
 */
export async function verifyWalletOwnership(
  req: NextRequest,
  walletAddress: string
): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(verifiedClaims.userId);
    const normalizedRequestedWallet = walletAddress.toLowerCase();

    const ownsWallet = user.linkedAccounts?.some((account) => {
      if (account.type !== 'wallet' || !('address' in account)) {
        return false;
      }
      return account.address.toLowerCase() === normalizedRequestedWallet;
    });

    if (!ownsWallet) {
      return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true, userId: verifiedClaims.userId };
  } catch {
    return { authorized: false, error: 'Invalid or expired token' };
  }
}

export async function createSpendPrivyServerWallet(params: {
  idempotencyKey: string;
}): Promise<SpendServerWalletMetadata> {
  try {
    const wallet = await getPrivyClient().walletApi.createWallet({
      chainType: 'ethereum',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      privy_server_wallet_id: wallet.id,
      server_wallet_address: wallet.address,
      server_wallet_chain: 'base-mainnet',
      server_wallet_created_at: wallet.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('createSpendPrivyServerWallet:', error);
    throw new Error('Privy server wallet could not be created');
  }
}
