import { fetchEvent } from '@/lib/dice/client';
import { getDiceEventPosterUrl } from '@/lib/dice/get-poster';
import { getDiceEventTicketsUrl } from '@/lib/dice/links';
import { getFeaturedDiceEventId } from '@/lib/db/featured-dice-event';
import { getFeaturedManualEvent } from '@/lib/db/manual-events';

export type HomepageFeaturedEvent = {
  title: string;
  thumbnailUrl: string;
  rsvpLink: string;
};

/**
 * Resolve the homepage Upcoming Events poster: admin-featured DICE event first,
 * then admin-featured manual event, otherwise null (UI falls back to static art).
 */
export async function getHomepageFeaturedEvent(): Promise<HomepageFeaturedEvent | null> {
  const diceEventId = await getFeaturedDiceEventId();

  if (diceEventId) {
    try {
      const event = await fetchEvent(diceEventId);
      if (event.hidden === true) {
        // Hidden on DICE — fall through to manual or static fallback.
      } else if (event.state === 'DRAFT' || event.state === 'CANCELLED') {
        // Not suitable for homepage — fall through.
      } else {
        return {
          title: event.name,
          thumbnailUrl: getDiceEventPosterUrl(event.images) ?? '',
          rsvpLink: getDiceEventTicketsUrl(event.name),
        };
      }
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
