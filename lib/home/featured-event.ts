import { fetchEvent } from '@/lib/dice/client';
import { getDiceEventPosterUrl } from '@/lib/dice/get-poster';
import { getDiceEventTicketsUrl } from '@/lib/dice/links';
import { listFeaturedDiceEventIds } from '@/lib/db/featured-dice-event';
import { getFeaturedManualEvent } from '@/lib/db/manual-events';

export type HomepageFeaturedEvent = {
  title: string;
  thumbnailUrl: string;
  rsvpLink: string;
};

/**
 * Resolve the homepage Upcoming Events poster fallback: first valid admin-featured
 * DICE event, then first admin-featured manual event, otherwise null.
 */
export async function getHomepageFeaturedEvent(): Promise<HomepageFeaturedEvent | null> {
  const diceEventIds = await listFeaturedDiceEventIds();

  for (const diceEventId of diceEventIds) {
    try {
      const event = await fetchEvent(diceEventId);
      if (event.hidden === true) continue;
      if (event.state === 'DRAFT' || event.state === 'CANCELLED') continue;

      return {
        title: event.name,
        thumbnailUrl: getDiceEventPosterUrl(event.images) ?? '',
        rsvpLink: getDiceEventTicketsUrl(event.name),
      };
    } catch (error) {
      console.error('Failed to load featured DICE event for homepage:', error);
    }
  }

  const manualEvent = await getFeaturedManualEvent();
  if (!manualEvent) return null;

  return {
    title: manualEvent.title,
    thumbnailUrl: manualEvent.thumbnailUrl,
    rsvpLink: manualEvent.rsvpLink,
  };
}
