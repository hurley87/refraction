import { NextRequest } from 'next/server';
import { getPlayerByEmail } from '@/lib/db/players';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getPrivyClient, verifyCallerIdentity } from '@/lib/api/privy';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import { ensureStellarRailUserWallet } from '@/lib/privy/stellar-rail-wallet';

/**
 * GET - Get Stellar wallet for a user
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const privyUserId = searchParams.get('privyUserId');

  if (!privyUserId) {
    return apiError('Privy user ID is required', 400);
  }

  const auth = await verifyCallerIdentity(req, privyUserId);
  if (!auth.authorized) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  try {
    const privy = getPrivyClient();

    const user = await privy.getUser(privyUserId);

    // Prefer `players.stellar_wallet_address` when set: it is the IRL profile
    // canonical key (e.g. server-created Tier 2 wallet). Privy may also expose a
    // different linked Stellar account (Tier 1); claim-points and balances must
    // match the DB row, not necessarily the first linked wallet.
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

    const stellarWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === 'wallet' &&
        'chainType' in account &&
        account.chainType === 'stellar'
    );

    if (stellarWallet && 'address' in stellarWallet) {
      return apiSuccess({
        address: stellarWallet.address,
        walletId: 'id' in stellarWallet ? stellarWallet.id : undefined,
      });
    }

    return apiSuccess({ address: null });
  } catch (error) {
    console.error('Error fetching Stellar wallet:', error);
    captureHandledException(error, {
      route: '/api/stellar-wallet',
      operation: 'get_stellar_wallet',
      statusCode: 500,
      extra: { hasPrivyUserId: Boolean(privyUserId) },
    });
    return apiError(
      error instanceof Error ? error.message : 'Failed to fetch wallet',
      500
    );
  }
}

/**
 * POST - Create Stellar wallet for a user
 */
export async function POST(req: NextRequest) {
  const { privyUserId } = await req.json();

  if (!privyUserId) {
    return apiError('Privy user ID is required', 400);
  }

  const auth = await verifyCallerIdentity(req, privyUserId);
  if (!auth.authorized) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  try {
    const result = await ensureStellarRailUserWallet(privyUserId);

    return apiSuccess(
      {
        address: result.address,
        walletId: result.walletId,
      },
      result.provisioned
        ? 'Stellar wallet created successfully'
        : 'Stellar wallet already exists'
    );
  } catch (error) {
    console.error('Error creating Stellar wallet:', error);
    captureHandledException(error, {
      route: '/api/stellar-wallet',
      operation: 'create_stellar_wallet',
      statusCode: 500,
      extra: { hasPrivyUserId: Boolean(privyUserId) },
    });
    return apiError(
      error instanceof Error ? error.message : 'Failed to create wallet',
      500
    );
  }
}
