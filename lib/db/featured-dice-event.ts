import { supabase } from './client';
import {
  HOMEPAGE_FEATURED_CAP_ERROR,
  MAX_HOMEPAGE_FEATURED_EVENTS,
} from '@/lib/home/homepage-featured';

export { MAX_HOMEPAGE_FEATURED_EVENTS, HOMEPAGE_FEATURED_CAP_ERROR };

export class HomepageFeaturedCapError extends Error {
  constructor(message = HOMEPAGE_FEATURED_CAP_ERROR) {
    super(message);
    this.name = 'HomepageFeaturedCapError';
  }
}

interface FeaturedDiceEventRow {
  dice_event_id: string;
  featured_at: string;
}

/** Count homepage featured events across DICE + manual sources. */
export async function countHomepageFeaturedEvents(exclude?: {
  manualEventId?: string;
}): Promise<number> {
  const [diceResult, manualResult] = await Promise.all([
    supabase.from('featured_dice_events').select('dice_event_id', {
      count: 'exact',
      head: true,
    }),
    (() => {
      let query = supabase
        .from('manual_events')
        .select('id', { count: 'exact', head: true })
        .eq('is_featured', true);
      if (exclude?.manualEventId) {
        query = query.neq('id', exclude.manualEventId);
      }
      return query;
    })(),
  ]);

  if (diceResult.error) throw diceResult.error;
  if (manualResult.error) throw manualResult.error;

  return (diceResult.count ?? 0) + (manualResult.count ?? 0);
}

/** Returns all featured DICE event ids, oldest featured first. */
export async function listFeaturedDiceEventIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('featured_dice_events')
    .select('dice_event_id')
    .order('featured_at', { ascending: true });

  if (error) throw error;
  return (data as Pick<FeaturedDiceEventRow, 'dice_event_id'>[]).map(
    (row) => row.dice_event_id
  );
}

/** @deprecated Use listFeaturedDiceEventIds — returns first featured id or null. */
export async function getFeaturedDiceEventId(): Promise<string | null> {
  const ids = await listFeaturedDiceEventIds();
  return ids[0] ?? null;
}

/** Add a DICE event to homepage featured list (no-op if already featured). */
export async function addFeaturedDiceEvent(diceEventId: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('featured_dice_events')
    .select('dice_event_id')
    .eq('dice_event_id', diceEventId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const count = await countHomepageFeaturedEvents();
  if (count >= MAX_HOMEPAGE_FEATURED_EVENTS) {
    throw new HomepageFeaturedCapError();
  }

  const { error } = await supabase
    .from('featured_dice_events')
    .insert({ dice_event_id: diceEventId });

  if (error) throw error;
}

/** Remove one featured DICE event. */
export async function removeFeaturedDiceEvent(
  diceEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('featured_dice_events')
    .delete()
    .eq('dice_event_id', diceEventId);

  if (error) throw error;
}

/** @deprecated Use addFeaturedDiceEvent. */
export async function setFeaturedDiceEvent(diceEventId: string): Promise<void> {
  await addFeaturedDiceEvent(diceEventId);
}

/** @deprecated Use removeFeaturedDiceEvent for each id. */
export async function clearFeaturedDiceEvent(): Promise<void> {
  const { error } = await supabase
    .from('featured_dice_events')
    .delete()
    .neq('dice_event_id', '');

  if (error) throw error;
}
