import { NextRequest } from 'next/server';
import { verifyWalletOwnership } from '@/lib/api/privy';
import { apiError, apiSuccess } from '@/lib/api/response';
import { supabase } from '@/lib/db/client';
import { getPlayerByWallet, updatePlayerPoints } from '@/lib/db/players';
import {
  WALLETCON_CANNES_MINT_ACTIVITY_TYPE,
  WALLETCON_CANNES_MINT_POINTS,
} from '@/lib/constants';

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

    const activityWallet = player.wallet_address;

    const { data: existing, error: existingError } = await supabase
      .from('points_activities')
      .select('id')
      .eq('user_wallet_address', activityWallet)
      .eq('activity_type', WALLETCON_CANNES_MINT_ACTIVITY_TYPE)
      .limit(1);

    if (existingError) {
      console.error('[walletcon-mint-points] lookup error:', existingError);
      return apiError('Failed to verify existing mint points', 500);
    }

    if (existing && existing.length > 0) {
      return apiSuccess({
        pointsAwarded: 0,
        alreadyAwarded: true,
        totalPoints: player.total_points ?? 0,
      });
    }

    const baseInsertPayload = {
      user_wallet_address: activityWallet,
      activity_type: WALLETCON_CANNES_MINT_ACTIVITY_TYPE,
      points_earned: WALLETCON_CANNES_MINT_POINTS,
      description: 'WalletCon Cannes - NFT mint successful',
      metadata: { source: 'claim_success_page' },
      processed: true,
    };

    const idempotencyKey = `${activityWallet.toLowerCase()}:${WALLETCON_CANNES_MINT_ACTIVITY_TYPE}`;

    let { error: insertError } = await supabase
      .from('points_activities')
      .insert({
        ...baseInsertPayload,
        idempotency_key: idempotencyKey,
      });

    // Backward compatibility while idempotency_key migration rolls out.
    if (insertError?.code === '42703') {
      ({ error: insertError } = await supabase
        .from('points_activities')
        .insert(baseInsertPayload));
    }

    if (insertError) {
      if (insertError.code === '23505') {
        return apiSuccess({
          pointsAwarded: 0,
          alreadyAwarded: true,
          totalPoints: player.total_points ?? 0,
        });
      }
      console.error('[walletcon-mint-points] insert error:', insertError);
      return apiError('Failed to record mint points activity', 500);
    }

    const updated = await updatePlayerPoints(
      player.id,
      WALLETCON_CANNES_MINT_POINTS
    );

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
