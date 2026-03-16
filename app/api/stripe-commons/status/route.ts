import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import {
  STRIPE_COMMONS_ACTIVITY_TYPE,
  STRIPE_COMMONS_TOTAL_SUPPLY,
} from '@/lib/contracts/stripe-commons-erc721';

/**
 * Staff-facing endpoint to verify claim status.
 * GET /api/stripe-commons/status?wallet=0x...
 *
 * Returns whether the given wallet has claimed its Stripe Commons artwork.
 * No auth required – it only exposes a boolean flag and token ID so staff
 * can quickly verify before handing out the physical print.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'wallet query parameter is required' },
        { status: 400 }
      );
    }

    const normalized = wallet.toLowerCase();

    const { data, error } = await supabase
      .from('points_activities')
      .select('metadata, created_at')
      .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE)
      .eq('user_wallet_address', normalized)
      .limit(1);

    if (error) throw error;

    const claimed = data && data.length > 0;

    const { count, error: countError } = await supabase
      .from('points_activities')
      .select('id', { count: 'exact', head: true })
      .eq('activity_type', STRIPE_COMMONS_ACTIVITY_TYPE);

    if (countError) throw countError;

    return NextResponse.json({
      success: true,
      wallet: normalized,
      claimed,
      tokenId: claimed ? data![0].metadata?.token_id : null,
      claimedAt: claimed ? data![0].created_at : null,
      totalClaimed: count || 0,
      totalSupply: STRIPE_COMMONS_TOTAL_SUPPLY,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to check status';
    console.error('Error in stripe-commons status:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
