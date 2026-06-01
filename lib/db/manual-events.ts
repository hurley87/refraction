import { supabase } from './client';

export interface ManualEventRow {
  id: string;
  title: string;
  thumbnail_url: string;
  date: string;
  end_date: string | null;
  city: string;
  maps_link: string;
  rsvp_link: string;
  created_at: string;
  updated_at: string;
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
}

const COLUMNS =
  'id, title, thumbnail_url, date, end_date, city, maps_link, rsvp_link, created_at, updated_at';

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
  };
}

export async function listManualEvents(): Promise<ManualEventPublic[]> {
  const { data, error } = await supabase
    .from('manual_events')
    .select(COLUMNS)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as ManualEventRow[]).map(toPublic);
}

export async function createManualEvent(
  input: Omit<ManualEventPublic, 'id'>
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
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toPublic(data as ManualEventRow);
}

export async function updateManualEvent(
  id: string,
  input: Omit<ManualEventPublic, 'id'>
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toPublic(data as ManualEventRow);
}

export async function deleteManualEvent(id: string): Promise<void> {
  const { error } = await supabase.from('manual_events').delete().eq('id', id);

  if (error) throw error;
}
