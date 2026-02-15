import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db/client';
import { checkAdminPermission } from '@/lib/db/admin';
import { getPlayersByEmails, updatePlayerPoints } from '@/lib/db/players';
import { fetchEvent, fetchEventTicketHolders } from '@/lib/dice/client';
import { apiSuccess, apiError } from '@/lib/api/response';

const rewardBodySchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  pointsPerHolder: z
    .number()
    .int()
    .min(1, 'pointsPerHolder must be at least 1'),
});

/**
 * POST /api/admin/dice/reward-ticket-holders
 * Awards points to all matched ticket holders for a DICE event.
 * Enforces: event must be over, only once per event.
 */
export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email');
    if (!checkAdminPermission(adminEmail || undefined)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const parsed = rewardBodySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join('; ');
      return apiError(message, 400);
    }

    const { eventId, pointsPerHolder } = parsed.data;

    const event = await fetchEvent(eventId);
    const eventEnd = event.endDatetime
      ? new Date(event.endDatetime)
      : event.startDatetime
        ? new Date(
            new Date(event.startDatetime).getTime() + 24 * 60 * 60 * 1000
          )
        : null;

    if (!eventEnd || eventEnd.getTime() > Date.now()) {
      return apiError(
        'Event has not ended yet. Points can only be awarded after the event is over.',
        400
      );
    }

    const { holders, eventName } = await fetchEventTicketHolders(eventId);

    const uniqueEmails = new Set<string>();
    for (const h of holders) {
      const email = h.email?.trim().toLowerCase();
      if (email) uniqueEmails.add(email);
    }

    // Insert placeholder tracking record FIRST — the UNIQUE(dice_event_id)
    // constraint prevents double-awarding atomically.
    const { error: lockError } = await supabase
      .from('dice_event_rewards')
      .insert({
        dice_event_id: eventId,
        dice_event_name: eventName,
        points_per_holder: pointsPerHolder,
        total_holders_found: 0,
        matched_players: 0,
        unmatched_holders: 0,
        total_points_awarded: 0,
        awarded_by_email: adminEmail ?? '',
      });

    if (lockError) {
      if (lockError.code === '23505') {
        return apiError(
          'Points for this event have already been awarded',
          409
        );
      }
      return apiError('Failed to initialize reward record', 500);
    }

    // Batch-fetch all players by email in a single query
    const emailList = Array.from(uniqueEmails);
    const players = await getPlayersByEmails(emailList);
    const playerByEmail = new Map(
      players
        .filter((p) => p.email)
        .map((p) => [p.email!.toLowerCase(), p])
    );

    const unmatchedEmails: string[] = [];
    let matchedPlayers = 0;
    let totalPointsAwarded = 0;

    // Batch-insert all points_activities rows in one call
    const activityRows: {
      user_wallet_address: string;
      activity_type: string;
      points_earned: number;
      description: string;
      metadata: Record<string, unknown>;
      processed: boolean;
    }[] = [];

    const matchedEntries: { playerId: number; email: string }[] = [];

    for (const email of emailList) {
      const player = playerByEmail.get(email);
      if (!player?.id) {
        unmatchedEmails.push(email);
        continue;
      }

      const hasEvmWallet =
        player.wallet_address &&
        /^0x[a-fA-F0-9]{40}$/.test(player.wallet_address);

      if (hasEvmWallet) {
        activityRows.push({
          user_wallet_address: player.wallet_address!,
          activity_type: 'dice_event_reward',
          points_earned: pointsPerHolder,
          description: `DICE event reward: ${eventName}`,
          metadata: {
            dice_event_id: eventId,
            dice_event_name: eventName,
            awarded_by: adminEmail,
          },
          processed: true,
        });
      }

      matchedEntries.push({ playerId: player.id, email });
    }

    // Insert all activity rows in one batch
    if (activityRows.length > 0) {
      const { error: activityError } = await supabase
        .from('points_activities')
        .insert(activityRows);

      if (activityError) {
        console.error('points_activities batch insert error:', activityError);
        // Continue — points will still be awarded via updatePlayerPoints
      }
    }

    // Award points to each matched player
    for (const { playerId, email } of matchedEntries) {
      try {
        await updatePlayerPoints(playerId, pointsPerHolder);
        matchedPlayers += 1;
        totalPointsAwarded += pointsPerHolder;
      } catch (err) {
        console.error(`Failed to award points to player ${playerId}:`, err);
        unmatchedEmails.push(email);
      }
    }

    // Update the tracking record with final counts
    const { error: updateError } = await supabase
      .from('dice_event_rewards')
      .update({
        total_holders_found: holders.length,
        matched_players: matchedPlayers,
        unmatched_holders: uniqueEmails.size - matchedPlayers,
        total_points_awarded: totalPointsAwarded,
      })
      .eq('dice_event_id', eventId);

    if (updateError) {
      console.error('Failed to update tracking record:', updateError);
    }

    return apiSuccess({
      totalHolders: holders.length,
      uniqueEmails: uniqueEmails.size,
      matchedPlayers,
      unmatchedEmails,
      totalPointsAwarded,
      eventName,
    });
  } catch (error) {
    console.error('reward-ticket-holders error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError(`Failed to award points: ${message}`, 500);
  }
}
