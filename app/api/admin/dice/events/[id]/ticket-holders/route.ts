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

    const { holders, eventName } = await fetchEventTicketHolders(eventId);

    const uniqueEmails = new Set<string>();
    for (const h of holders) {
      const email = h.email?.trim().toLowerCase();
      if (email) uniqueEmails.add(email);
    }

    // Batch-fetch all players in a single query instead of N+1 loop
    const emailList = Array.from(uniqueEmails);
    const players = await getPlayersByEmails(emailList);
    const playerByEmail = new Map(
      players.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p])
    );

    const matchedEmails: string[] = [];
    for (const email of emailList) {
      if (playerByEmail.has(email)) matchedEmails.push(email);
    }

    return apiSuccess({
      totalHolders: holders.length,
      uniqueEmails: uniqueEmails.size,
      matchedPlayers: matchedEmails.length,
      matchedEmails,
      alreadyRewarded,
      eventName,
    });
  } catch (error) {
    console.error('ticket-holders preview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError(`Failed to load ticket holders: ${message}`, 500);
  }
}
