import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { checkAdminPermission } from '@/lib/db/admin';
import { getPlayersByEmails } from '@/lib/db/players';
import { fetchEventTicketHolders } from '@/lib/dice/client';
import { apiSuccess, apiError } from '@/lib/api/response';

/**
 * GET /api/admin/dice/events/[id]/ticket-holders
 * Preview ticket holder counts and match status for an event (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminEmail = request.headers.get('x-user-email');
    if (!checkAdminPermission(adminEmail || undefined)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const { id: eventId } = await params;
    if (!eventId) {
      return apiError('Event ID is required', 400);
    }

    const { data: existingReward } = await supabase
      .from('dice_event_rewards')
      .select('dice_event_id')
      .eq('dice_event_id', eventId)
      .single();

    const alreadyRewarded = !!existingReward;

    const { holders, eventName, endDatetime, startDatetime } =
      await fetchEventTicketHolders(eventId);

    const eventEnd = endDatetime
      ? new Date(endDatetime)
      : startDatetime
        ? new Date(new Date(startDatetime).getTime() + 24 * 60 * 60 * 1000)
        : null;
    const eventEnded = !!eventEnd && eventEnd.getTime() <= Date.now();

    const uniqueEmails = new Set<string>();
    for (const h of holders) {
      const email = h.email?.trim().toLowerCase();
      if (email) uniqueEmails.add(email);
    }

    // Batch-fetch all players in a single query instead of N+1 loop
    const players = await getPlayersByEmails(Array.from(uniqueEmails));
    const matchedPlayers = players.filter((p) => p.id).length;

    return apiSuccess({
      totalHolders: holders.length,
      uniqueEmails: uniqueEmails.size,
      matchedPlayers,
      alreadyRewarded,
      eventEnded,
      eventName,
    });
  } catch (error) {
    console.error('ticket-holders preview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError(`Failed to load ticket holders: ${message}`, 500);
  }
}
