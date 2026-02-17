/**
 * One-off script: import Denver locations from data/denver.csv into the locations table.
 * - Geocodes addresses via Mapbox Geocoding API
 * - Uses a shared placeholder image so locations appear on the map (API requires coin_image_url)
 * - Inserts locations with is_visible: true
 *
 * Run: npx tsx scripts/import-denver.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CREATOR_WALLET = '0x30a898A919a3C8A95a291828b0040A1302BCb036';
const CREATOR_USERNAME = 'jim@refractionfestival.com';
const POINTS_VALUE = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const MAPBOX_RATE_LIMIT_MS = 200;
const DENVER_CENTER_LAT = 39.7392;
const DENVER_CENTER_LON = -104.9903;
const PLACEHOLDER_PATH = 'location-images/denver-placeholder.png';

/** Minimal 1x1 grey PNG as base64 for placeholder image */
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

type DenverCsvRow = {
  locationName: string;
  address: string;
  category: string;
  quote: string;
  recommendedBy: string;
};

/**
 * Parse a single CSV line handling quoted fields (commas inside quotes are preserved).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let end = i;
      while (end < line.length && line[end] !== '"') {
        if (line[end] === '\\') end += 2;
        else end += 1;
      }
      fields.push(line.slice(i, end).replace(/""/g, '"'));
      i = end + 1;
      if (line[i] === ',') i += 1;
    } else {
      const comma = line.indexOf(',', i);
      if (comma === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
  }
  return fields;
}

function parseDenverCsv(content: string): DenverCsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: DenverCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 3) continue;
    const locationName = (values[0] ?? '').trim();
    const address = (values[1] ?? '').trim();
    const category = (values[2] ?? '').trim();
    const quote = (values[3] ?? '').trim();
    const recommendedBy = (values[4] ?? '').trim();
    if (!address) continue;
    rows.push({ locationName, address, category, quote, recommendedBy });
  }
  return rows;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Geocode address using Mapbox Geocoding v5. Returns [longitude, latitude] or null.
 */
async function geocodeAddress(
  address: string,
  mapboxToken: string
): Promise<[number, number] | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Geocoding failed for "${address}": ${res.status}`);
    return null;
  }
  const data = (await res.json()) as {
    features?: { center: [number, number] }[];
  };
  const center = data.features?.[0]?.center;
  if (!center || center.length < 2) return null;
  return [center[0], center[1]];
}

/**
 * Ensure placeholder image exists in Supabase Storage; return its public URL.
 */
async function ensurePlaceholderImage(
  supabase: SupabaseClient
): Promise<string> {
  const buffer = Buffer.from(MINIMAL_PNG_BASE64, 'base64');
  const { error } = await supabase.storage
    .from('images')
    .upload(PLACEHOLDER_PATH, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });
  if (error) {
    throw new Error(`Placeholder upload failed: ${error.message}`);
  }
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(PLACEHOLDER_PATH);
  return data.publicUrl;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
    process.exit(1);
  }
  if (!mapboxToken) {
    console.error('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), 'data', 'denver.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseDenverCsv(csvContent);
  console.log(`Parsed ${rows.length} locations from CSV.`);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const placeholderUrl = await ensurePlaceholderImage(supabase);
  console.log('Placeholder image ready.');

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.locationName;
    if (!name) {
      console.warn(`Row ${i + 2}: missing location name, skipping.`);
      fail += 1;
      continue;
    }

    const placeId = `denver-${slugify(name)}`;
    if (!placeId || placeId === 'denver-') {
      console.warn(
        `Row ${i + 2}: could not generate place_id for "${name}", skipping.`
      );
      fail += 1;
      continue;
    }

    const address = row.address?.trim() || '';
    const description = row.quote?.slice(0, DESCRIPTION_MAX_LENGTH) || null;
    const type = row.category?.trim() || null;

    let latitude: number;
    let longitude: number;
    const coords = await geocodeAddress(address, mapboxToken);
    if (coords) {
      [longitude, latitude] = coords;
    } else {
      console.warn(
        `Row ${i + 2} "${name}": geocoding failed, using Denver center.`
      );
      latitude = DENVER_CENTER_LAT;
      longitude = DENVER_CENTER_LON;
    }
    await sleep(MAPBOX_RATE_LIMIT_MS);

    const payload = {
      place_id: placeId,
      name,
      address: address || null,
      description,
      latitude,
      longitude,
      points_value: POINTS_VALUE,
      type,
      event_url: null,
      context: JSON.stringify({ created_at: new Date().toISOString() }),
      coin_image_url: placeholderUrl,
      creator_wallet_address: CREATOR_WALLET,
      creator_username: CREATOR_USERNAME,
      is_visible: true,
    };

    const { error } = await supabase
      .from('locations')
      .upsert(payload, { onConflict: 'place_id' });

    if (error) {
      console.error(`Row ${i + 2} "${name}": insert failed:`, error.message);
      fail += 1;
    } else {
      console.log(`Row ${i + 2}: inserted "${name}" (${placeId}).`);
      ok += 1;
    }
  }

  console.log(`\nDone. Inserted/updated: ${ok}, failed: ${fail}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
