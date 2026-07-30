import { supabase } from './client';

export type Country = {
  id: string;
  iso2: string;
  name: string;
};

type CountryRow = {
  id: string;
  iso2: string;
  name: string;
};

const COLUMNS = 'id, iso2, name';

function toCountry(row: CountryRow): Country {
  return {
    id: row.id,
    iso2: row.iso2.trim().toUpperCase(),
    name: row.name,
  };
}

export async function listCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select(COLUMNS)
    .order('name', { ascending: true });

  if (error) throw error;
  return ((data as CountryRow[]) ?? []).map(toCountry);
}

export async function getCountryById(id: string): Promise<Country | null> {
  const { data, error } = await supabase
    .from('countries')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toCountry(data as CountryRow) : null;
}

export async function getCountryByIso2(iso2: string): Promise<Country | null> {
  const { data, error } = await supabase
    .from('countries')
    .select(COLUMNS)
    .eq('iso2', iso2.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data ? toCountry(data as CountryRow) : null;
}
