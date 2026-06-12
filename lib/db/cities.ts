import { supabase } from './client';

export interface CityRow {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  aliases: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface CityInput {
  name: string;
  country: string | null;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
}

const COLUMNS =
  'id, name, slug, country, aliases, is_active, sort_order, created_at, updated_at';

/** Derive a stable, URL-safe slug from a free-text name. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function toCity(row: CityRow): City {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    aliases: row.aliases ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function listCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as CityRow[]).map(toCity);
}

export async function listActiveCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select(COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as CityRow[]).map(toCity);
}

export async function createCity(input: CityInput): Promise<City> {
  const { data, error } = await supabase
    .from('cities')
    .insert({
      name: input.name,
      slug: slugify(input.name),
      country: input.country,
      aliases: input.aliases,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toCity(data as CityRow);
}

export async function updateCity(id: string, input: CityInput): Promise<City> {
  const { data, error } = await supabase
    .from('cities')
    .update({
      name: input.name,
      slug: slugify(input.name),
      country: input.country,
      aliases: input.aliases,
      is_active: input.isActive,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toCity(data as CityRow);
}

export async function deleteCity(id: string): Promise<void> {
  const { error } = await supabase.from('cities').delete().eq('id', id);
  if (error) throw error;
}
