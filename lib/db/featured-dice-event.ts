import { supabase } from './client';

const SINGLETON_ID = true;

interface FeaturedDiceEventRow {
  id: boolean;
  dice_event_id: string;
  updated_at: string;
}

/** Returns the featured DICE event id, or null when none is set. */
export async function getFeaturedDiceEventId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('featured_dice_event')
    .select('dice_event_id')
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return (data as Pick<FeaturedDiceEventRow, 'dice_event_id'>).dice_event_id;
}

/**
 * Set the featured DICE event and clear any manual event featured flag
 * so only one event is featured across both sources.
 */
export async function setFeaturedDiceEvent(diceEventId: string): Promise<void> {
  const { error: upsertError } = await supabase
    .from('featured_dice_event')
    .upsert(
      {
        id: SINGLETON_ID,
        dice_event_id: diceEventId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (upsertError) throw upsertError;

  const { error: clearManualError } = await supabase
    .from('manual_events')
    .update({ is_featured: false })
    .eq('is_featured', true);

  if (clearManualError) throw clearManualError;
}

/** Remove the featured DICE event selection. */
export async function clearFeaturedDiceEvent(): Promise<void> {
  const { error } = await supabase
    .from('featured_dice_event')
    .delete()
    .eq('id', SINGLETON_ID);

  if (error) throw error;
}
