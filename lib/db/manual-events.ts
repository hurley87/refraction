import { supabase } from './client';
import { clearFeaturedDiceEvent } from './featured-dice-event';

export interface ManualEventRow {
  id: string;
  title: string;
  thumbnail_url: string;
  date: string;
  end_date: string | null;
  city: string;
  maps_link: string;
  rsvp_link: string;
  hosted: boolean;
  is_featured: boolean;
  city_id: string | null;
  /**
   * Embedded canonical city (joined via city_id). Supabase types to-one
   * embeds as an array; at runtime it is a single object (or null).
   */
  cities: { slug: string } | { slug: string }[] | null;
  created_at: string;
  updated_at: string;
}

function embeddedCitySlug(cities: ManualEventRow['cities']): string | null {
  if (!cities) return null;
  if (Array.isArray(cities)) return cities[0]?.slug ?? null;
  return cities.slug ?? null;
}

export interface ManualEventPublic {
  id: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  /** Optional end date for multi-day events; null for single-day events. */
  endDate: string | null;
  city: string;
  mapsLink: string;
  rsvpLink: string;
  /** True when the event is hosted by IRL; false for events we only list/promote. */
  hosted: boolean;
  /** When true, shown on the homepage Upcoming Events section. */
  isFeatured: boolean;
  /** Canonical city reference (cities.id); null when unset/legacy. */
  cityId: string | null;
  /** Canonical city slug (stable filter key); null when unset/legacy. */
  citySlug: string | null;
}

const COLUMNS =
  'id, title, thumbnail_url, date, end_date, city, maps_link, rsvp_link, hosted, is_featured, city_id, cities(slug), created_at, updated_at';

function toPublic(row: ManualEventRow): ManualEventPublic {
  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    date: row.date,
    endDate: row.end_date,
    city: row.city,
    mapsLink: row.maps_link,
    rsvpLink: row.rsvp_link,
    hosted: row.hosted ?? false,
    isFeatured: row.is_featured ?? false,
    cityId: row.city_id ?? null,
    citySlug: embeddedCitySlug(row.cities),
  };
}

async function clearFeaturedExcept(exceptId: string): Promise<void> {
  const { error } = await supabase
    .from('manual_events')
    .update({ is_featured: false })
    .eq('is_featured', true)
    .neq('id', exceptId);

  if (error) throw error;
}

export async function listManualEvents(): Promise<ManualEventPublic[]> {
  const { data, error } = await supabase
    .from('manual_events')
    .select(COLUMNS)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as unknown as ManualEventRow[]).map(toPublic);
}

export async function getFeaturedManualEvent(): Promise<ManualEventPublic | null> {
  const { data, error } = await supabase
    .from('manual_events')
    .select(COLUMNS)
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toPublic(data as unknown as ManualEventRow);
}

/** Writable fields for create/update; `citySlug` is derived from `cityId`. */
export type ManualEventWriteInput = Omit<ManualEventPublic, 'id' | 'citySlug'>;

export async function createManualEvent(
  input: ManualEventWriteInput
): Promise<ManualEventPublic> {
  const { data, error } = await supabase
    .from('manual_events')
    .insert({
      title: input.title,
      thumbnail_url: input.thumbnailUrl,
      date: input.date,
      end_date: input.endDate,
      city: input.city,
      maps_link: input.mapsLink,
      rsvp_link: input.rsvpLink,
      hosted: input.hosted,
      is_featured: input.isFeatured,
      city_id: input.cityId,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  const created = toPublic(data as unknown as ManualEventRow);
  if (created.isFeatured) {
    await clearFeaturedExcept(created.id);
    await clearFeaturedDiceEvent();
  }
  return created;
}

export async function updateManualEvent(
  id: string,
  input: ManualEventWriteInput
): Promise<ManualEventPublic> {
  const { data, error } = await supabase
    .from('manual_events')
    .update({
      title: input.title,
      thumbnail_url: input.thumbnailUrl,
      date: input.date,
      end_date: input.endDate,
      city: input.city,
      maps_link: input.mapsLink,
      rsvp_link: input.rsvpLink,
      hosted: input.hosted,
      is_featured: input.isFeatured,
      city_id: input.cityId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  const updated = toPublic(data as unknown as ManualEventRow);
  if (updated.isFeatured) {
    await clearFeaturedExcept(updated.id);
    await clearFeaturedDiceEvent();
  }
  return updated;
}

export async function deleteManualEvent(id: string): Promise<void> {
  const { error } = await supabase.from('manual_events').delete().eq('id', id);

  if (error) throw error;
}
