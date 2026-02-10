/**
 * One-off script: import Hong Kong locations from public/hong-kong.csv into the locations table.
 * - Geocodes addresses via Mapbox Geocoding API
 * - Downloads images from Google Drive and uploads to Supabase Storage
 * - Inserts locations with is_visible: true
 *
 * Run: npx tsx scripts/import-hong-kong.ts
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

type CsvRow = {
  category: string;
  location: string;
  address: string;
  quote: string;
  imageLink: string;
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

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 5) continue;
    rows.push({
      category: (values[0] ?? '').trim(),
      location: (values[1] ?? '').trim(),
      address: (values[2] ?? '').trim(),
      quote: (values[3] ?? '').trim(),
      imageLink: (values[4] ?? '').trim(),
      recommendedBy: (values[5] ?? '').trim(),
    });
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
 * Extract Google Drive file ID from share URL.
 */
function extractDriveFileId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Download image from Google Drive (public link) and return buffer + inferred content type, or null.
 */
async function downloadFromGoogleDrive(
  fileId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // Try direct image URL first (works for publicly shared images)
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(directUrl, { redirect: 'follow' });
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) return null;
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  // Skip if Google returned HTML (e.g. virus scan page) instead of image
  if (contentType.includes('text/html') || buffer.length < 200) return null;
  return { buffer, contentType };
}

/**
 * Upload buffer to Supabase Storage and return public URL.
 */
async function uploadToSupabase(
  supabase: SupabaseClient,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    console.warn(`Storage upload failed for ${filePath}:`, error.message);
    return null;
  }
  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
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

  const csvPath = path.join(process.cwd(), 'public', 'hong-kong.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} locations from CSV.`);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.location;
    if (!name) {
      console.warn(`Row ${i + 2}: missing location name, skipping.`);
      fail += 1;
      continue;
    }

    const placeId = `hk-${slugify(name)}`;
    if (!placeId || placeId === 'hk-') {
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
        `Row ${i + 2} "${name}": geocoding failed, using Hong Kong center.`
      );
      latitude = 22.3193;
      longitude = 114.1694;
    }
    await sleep(MAPBOX_RATE_LIMIT_MS);

    let coinImageUrl: string | null = null;
    const fileId = row.imageLink ? extractDriveFileId(row.imageLink) : null;
    if (fileId) {
      const downloaded = await downloadFromGoogleDrive(fileId);
      if (downloaded) {
        const ext = downloaded.contentType.split('/')[1] || 'jpg';
        const storagePath = `location-images/${Date.now()}-${slugify(name)}.${ext}`;
        const url = await uploadToSupabase(
          supabase,
          storagePath,
          downloaded.buffer,
          downloaded.contentType
        );
        if (url) coinImageUrl = url;
      }
      if (!coinImageUrl)
        console.warn(
          `Row ${i + 2} "${name}": image download/upload failed, continuing without image.`
        );
    }

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
      coin_image_url: coinImageUrl,
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
