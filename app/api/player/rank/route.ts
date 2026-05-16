import { NextRequest } from 'next/server';
import { supabase, isSupabaseEnvConfigured } from '@/lib/db/client';
import { isSupabaseNetworkError } from '@/lib/db/supabase-network-error';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const revalidate = 60; // Cache for 60 seconds

const DB_UNAVAILABLE =
  'Database is unavailable. Check SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, keys, and network access.';

// GET /api/player/rank?walletAddress=0x...
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseEnvConfigured()) {
      return apiError(
        'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.',
        503
      );
    }

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

    if (rpcError && isSupabaseNetworkError(rpcError)) {
      console.error('Player rank: Supabase unreachable (RPC)', rpcError);
      return apiError(DB_UNAVAILABLE, 503);
    }

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
        .limit(1)
        .maybeSingle();

      if (playerError) {
        if (isSupabaseNetworkError(playerError)) {
          console.error(
            'Player rank: Supabase unreachable (players)',
            playerError
          );
          return apiError(DB_UNAVAILABLE, 503);
        }
        throw playerError;
      }

      if (!player) {
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
      .limit(1)
      .maybeSingle();

    if (userError) {
      if (isSupabaseNetworkError(userError)) {
        console.error(
          'Player rank: Supabase unreachable (fallback)',
          userError
        );
        return apiError(DB_UNAVAILABLE, 503);
      }
      throw userError;
    }

    if (!userPlayer) {
      return apiSuccess({ rank: null, total_points: 0 });
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

    if (countError) {
      if (isSupabaseNetworkError(countError)) {
        console.error('Player rank: Supabase unreachable (count)', countError);
        return apiError(DB_UNAVAILABLE, 503);
      }
      throw countError;
    }

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
    if (isSupabaseNetworkError(error)) {
      console.error('Player rank: Supabase unreachable', error);
      return apiError(DB_UNAVAILABLE, 503);
    }
    console.error('Player rank API error:', error);
    return apiError('Failed to get player rank', 500);
  }
}
