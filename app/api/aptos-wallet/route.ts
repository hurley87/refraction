import { NextRequest } from 'next/server';
import {
  createOrUpdatePlayerForAptos,
  getPlayerByEmail,
} from '@/lib/db/players';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getPrivyClient, verifyCallerIdentity } from '@/lib/api/privy';

/**
 * GET - Get Aptos wallet for a user
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

    // Get user's wallets from Privy
    const user = await privy.getUser(privyUserId);

    // Find Aptos wallet in linked accounts (for Tier 1 wallets)
    const aptosWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === 'wallet' &&
        'chainType' in account &&
        (account as { chainType: string }).chainType === 'aptos'
    );

    if (aptosWallet && 'address' in aptosWallet) {
      return apiSuccess({
        address: aptosWallet.address,
        walletId: 'id' in aptosWallet ? aptosWallet.id : undefined,
      });
    }

    // For Tier 2 server-managed wallets, check the database via user's email
    const email = user.email?.address;
    if (email) {
      const player = await getPlayerByEmail(email);
      if (player?.aptos_wallet_address) {
        return apiSuccess({
          address: player.aptos_wallet_address,
          walletId: player.aptos_wallet_id ?? undefined,
        });
      }
    }

    return apiSuccess({ address: null });
  } catch (error) {
    console.error('Error fetching Aptos wallet:', error);
    return apiError(
      error instanceof Error ? error.message : 'Failed to fetch wallet',
      500
    );
  }
}

/**
 * POST - Create Aptos wallet for a user
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
    const privy = getPrivyClient();

    // Check if user already has an Aptos wallet
    const user = await privy.getUser(privyUserId);
    const existingAptosWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === 'wallet' &&
        'chainType' in account &&
        (account as { chainType: string }).chainType === 'aptos'
    );

    if (existingAptosWallet && 'address' in existingAptosWallet) {
      // Ensure wallet is saved to database (in case it wasn't previously)
      const email = user.email?.address ?? undefined;
      const walletId =
        'id' in existingAptosWallet ? existingAptosWallet.id : undefined;
      await createOrUpdatePlayerForAptos(
        existingAptosWallet.address,
        email,
        walletId ?? undefined
      );

      return apiSuccess(
        {
          address: existingAptosWallet.address,
          walletId:
            'id' in existingAptosWallet ? existingAptosWallet.id : undefined,
        },
        'Aptos wallet already exists'
      );
    }

    // Create a new Aptos wallet (Tier 2 - server-managed)
    // Note: Aptos wallets are created server-side without direct user ownership
    // The wallet address is stored in our database linked to the user
    const wallet = await privy.walletApi.create({
      chainType: 'aptos' as any, // Privy SDK types may not include 'aptos' yet, but API supports it
    });

    // Get user's email for account linking
    const email = user.email?.address ?? undefined;

    // Save to database (creates player or links wallet to existing player by email)
    await createOrUpdatePlayerForAptos(wallet.address, email, wallet.id);

    return apiSuccess(
      {
        address: wallet.address,
        walletId: wallet.id,
      },
      'Aptos wallet created successfully'
    );
  } catch (error) {
    console.error('Error creating Aptos wallet:', error);
    return apiError(
      error instanceof Error ? error.message : 'Failed to create wallet',
      500
    );
  }
}
