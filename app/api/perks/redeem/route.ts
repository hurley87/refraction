import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { redeemPerkRequestSchema } from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { trackRewardClaimed } from '@/lib/analytics';
import { setUserProperties as setUserPropertiesServer } from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

// POST /api/perks/redeem { perkId, walletAddress }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = redeemPerkRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { perkId, walletAddress } = validationResult.data;

    // Check user points and perk threshold (include email for identity resolution)
    const { data: user, error: userError } = await supabase
      .from('players')
      .select('total_points, email')
      .eq('wallet_address', walletAddress)
      .single();
    if (userError) throw userError;

    const { data: perk, error: perkError } = await supabase
      .from('perks')
      .select('*')
      .eq('id', perkId)
      .single();
    if (perkError) throw perkError;

    if (!user || user.total_points < perk.points_threshold) {
      return apiError('Insufficient points', 400);
    }

    // Prevent duplicate redemption
    const { data: existing, error: existingError } = await supabase
      .from('user_perk_redemptions')
      .select('id')
      .eq('perk_id', perkId)
      .eq('user_wallet_address', walletAddress)
      .single();
    if (existingError && existingError.code !== 'PGRST116') throw existingError; // PGRST116 = not found
    if (existing) {
      return apiError('Perk already redeemed', 400);
    }

    // Get available code
    const { data: availableCode, error: codeError } = await supabase
      .from('perk_discount_codes')
      .select('*')
      .eq('perk_id', perkId)
      .eq('is_claimed', false)
      .limit(1)
      .single();
    if (codeError || !availableCode) {
      return apiError('No discount codes available', 400);
    }

    // Create redemption and return code
    const { data, error } = await supabase
      .from('user_perk_redemptions')
      .insert({
        perk_id: perkId,
        discount_code_id: availableCode.id,
        user_wallet_address: walletAddress,
      })
      .select(`*, perk_discount_codes ( code )`)
      .single();
    if (error) throw error;

    // Use wallet address as distinct_id for analytics
    const distinctId = walletAddress;

    // Set user properties server-side
    setUserPropertiesServer(distinctId, {
      $email: user.email || undefined,
      wallet_address: walletAddress,
    });

    // Track reward claim
    trackRewardClaimed(distinctId, {
      reward_id: perkId,
      reward_type: perk.type,
      partner: perk.location || undefined,
      points_required: perk.points_threshold,
    });

    return apiSuccess({ redemption: data });
  } catch (error) {
    console.error('POST /api/perks/redeem error:', error);
    return apiError('Failed to redeem perk', 500);
  }
}
