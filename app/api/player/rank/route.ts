import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const revalidate = 60; // Cache for 60 seconds

// GET /api/player/rank?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return apiError('Wallet address is required', 400);
    }

    // Try optimized RPC function first (single efficient query with window function)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_player_rank',
      { p_wallet_address: walletAddress }
    );

    if (!rpcError && rpcResult && rpcResult.length > 0) {
      return apiSuccess({
        rank: Number(rpcResult[0].rank),
        total_points: rpcResult[0].total_points ?? 0,
      });
    }

    // If RPC returned empty (player not found or has 0 points), check if player exists
    if (!rpcError && rpcResult && rpcResult.length === 0) {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('total_points')
        .eq('wallet_address', walletAddress)
        .single();

      if (playerError?.code === 'PGRST116' || !player) {
        return apiSuccess({ rank: null, total_points: 0 });
      }

      // Player exists but has 0 points (not ranked)
      return apiSuccess({
        rank: null,
        total_points: player.total_points ?? 0,
      });
    }

    // Fallback: manual calculation if RPC doesn't exist
    const { data: userPlayer, error: userError } = await supabase
      .from('players')
      .select('id, total_points')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return apiSuccess({ rank: null, total_points: 0 });
      }
      throw userError;
    }

    // Count distinct point values higher than user's to determine DENSE_RANK
    const userPoints = userPlayer.total_points ?? 0;

    if (userPoints === 0) {
      return apiSuccess({ rank: null, total_points: 0 });
    }

    // Get distinct point values higher than user's points
    const { data: higherPoints, error: countError } = await supabase
      .from('players')
      .select('total_points')
      .gt('total_points', userPoints);

    if (countError) throw countError;

    // Count distinct point values (DENSE_RANK = distinct higher values + 1)
    const distinctHigherPoints = new Set(
      (higherPoints || []).map((p) => p.total_points)
    );
    const rank = distinctHigherPoints.size + 1;

    return apiSuccess({
      rank,
      total_points: userPoints,
    });
  } catch (error) {
    console.error('Player rank API error:', error);
    return apiError('Failed to get player rank', 500);
  }
}
