import { NextRequest } from 'next/server';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabase } from '@/lib/db/client';
import { getPlayerByWallet, updatePlayerPoints } from '@/lib/db/players';
import {
  WALLETCON_CANNES_CHECKIN_ACTIVITY_TYPE,
  WALLETCON_CANNES_CHECKIN_POINTS,
} from '@/lib/constants';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  return code === '23505';
}

/**
 * POST /api/claim/walletcon-checkin-points
 * Awards one-time IRL points when the user reaches the claim login success screen.
 * Body: { walletAddress: string } — must match the authenticated Privy wallet (Bearer token).
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

    const { data: existing, error: existingError } = await supabase
      .from('points_activities')
      .select('id')
      .ilike('user_wallet_address', activityWallet)
      .eq('activity_type', WALLETCON_CANNES_CHECKIN_ACTIVITY_TYPE)
      .limit(1);

    if (existingError) {
      console.error('[walletcon-checkin-points] lookup error:', existingError);
      return apiError('Failed to verify existing points', 500);
    }

    if (existing && existing.length > 0) {
      return apiSuccess({
        pointsAwarded: 0,
        alreadyAwarded: true,
        totalPoints: player.total_points ?? 0,
      });
    }

    const { data: insertedActivity, error: insertError } = await supabase
      .from('points_activities')
      .insert({
        user_wallet_address: activityWallet,
        activity_type: WALLETCON_CANNES_CHECKIN_ACTIVITY_TYPE,
        points_earned: WALLETCON_CANNES_CHECKIN_POINTS,
        description: 'WalletCon Cannes — check-in complete',
        metadata: { source: 'claim_login_success' },
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
      console.error('[walletcon-checkin-points] insert error:', insertError);
      return apiError('Failed to record points activity', 500);
    }

    let updated;
    try {
      updated = await updatePlayerPoints(player.id, WALLETCON_CANNES_CHECKIN_POINTS);
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
            '[walletcon-checkin-points] rollback failed after points update error:',
            rollbackError
          );
        }
      }
      throw updateError;
    }

    return apiSuccess({
      pointsAwarded: WALLETCON_CANNES_CHECKIN_POINTS,
      alreadyAwarded: false,
      totalPoints: updated?.total_points ?? null,
    });
  } catch (e) {
    console.error('[walletcon-checkin-points]', e);
    return apiError('Failed to award points', 500);
  }
}
