import { NextRequest } from 'next/server';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { apiError, apiSuccess } from '@/lib/api/response';
import { supabase } from '@/lib/db/client';
import { getPlayerByWallet, updatePlayerPoints } from '@/lib/db/players';
import {
  WALLETCON_CANNES_MINT_ACTIVITY_TYPE,
  WALLETCON_CANNES_MINT_POINTS,
} from '@/lib/constants';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';
  return code === '23505' || /duplicate key value/i.test(message);
}

/**
 * POST /api/claim/walletcon-mint-points
 * Awards one-time IRL points after a successful WalletCon NFT mint.
 * Body: { walletAddress: string } — must match the authenticated Privy wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress =
      typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';

    if (!walletAddress) {
      return apiError('walletAddress is required', 400);
    }

    const auth = await verifyWalletOwnership(req, walletAddress);
    if (!auth.authorized) {
      return apiError(auth.error ?? 'Unauthorized', 401);
    }

    const player =
      (await getPlayerByWallet(walletAddress)) ??
      (await getPlayerByWallet(walletAddress.toLowerCase()));

    if (!player?.id || !player.wallet_address) {
      return apiError(
        'Player profile not found for this wallet. Complete signup first.',
        404
      );
    }

    const activityWallet = player.wallet_address.toLowerCase();

    const { data: insertedActivity, error: insertError } = await supabase
      .from('points_activities')
      .insert({
        user_wallet_address: activityWallet,
        activity_type: WALLETCON_CANNES_MINT_ACTIVITY_TYPE,
        points_earned: WALLETCON_CANNES_MINT_POINTS,
        description: 'WalletCon Cannes - NFT mint successful',
        metadata: { source: 'claim_success_page' },
        processed: true,
      })
      .select('id')
      .single();

    if (insertError) {
      if (isUniqueConstraintViolation(insertError)) {
        return apiSuccess({
          pointsAwarded: 0,
          alreadyAwarded: true,
          totalPoints: player.total_points ?? 0,
        });
      }
      console.error('[walletcon-mint-points] insert error:', insertError);
      return apiError('Failed to record mint points activity', 500);
    }

    let updated;
    try {
      updated = await updatePlayerPoints(player.id, WALLETCON_CANNES_MINT_POINTS);
    } catch (updateError) {
      // Compensating action: if points increment fails after activity insert,
      // remove this activity so retry can safely award once.
      if (insertedActivity?.id) {
        const { error: rollbackError } = await supabase
          .from('points_activities')
          .delete()
          .eq('id', insertedActivity.id);
        if (rollbackError) {
          console.error(
            '[walletcon-mint-points] rollback failed after points update error:',
            rollbackError
          );
        }
      }
      throw updateError;
    }

    return apiSuccess({
      pointsAwarded: WALLETCON_CANNES_MINT_POINTS,
      alreadyAwarded: false,
      totalPoints: updated?.total_points ?? null,
    });
  } catch (e) {
    console.error('[walletcon-mint-points]', e);
    return apiError('Failed to award mint points', 500);
  }
}
