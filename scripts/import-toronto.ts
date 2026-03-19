/**
 * One-off script: import Toronto locations from public/toronto.csv into the locations table.
 * - Geocodes addresses via Mapbox Geocoding API
 * - Downloads images from Google Drive and uploads to Supabase Storage
 * - Skips rows that don't have an image (or whose image cannot be downloaded)
 * - Inserts locations with is_visible: true
 *
 * Run: npx tsx scripts/import-toronto.ts
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
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
    );
    process.exit(1);
  }
  if (!mapboxToken) {
    console.error('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in environment');
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), 'public', 'toronto.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} locations from CSV.`);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.location;
    const rowLabel = `Row ${i + 2} "${name}"`;

    if (!name) {
      console.warn(`Row ${i + 2}: missing location name, skipping.`);
      skipped += 1;
      continue;
    }

    // Skip if no image link provided
    if (!row.imageLink) {
      console.warn(`${rowLabel}: no image link, skipping.`);
      skipped += 1;
      continue;
    }

    const fileId = extractDriveFileId(row.imageLink);
    if (!fileId) {
      console.warn(`${rowLabel}: could not extract Google Drive file ID from "${row.imageLink}", skipping.`);
      skipped += 1;
      continue;
    }

    // Download image — skip if download fails
    const downloaded = await downloadFromGoogleDrive(fileId);
    if (!downloaded) {
      console.warn(`${rowLabel}: image download failed, skipping.`);
      skipped += 1;
      continue;
    }

    const ext = downloaded.contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const slug = slugify(name);
    const placeId = `toronto-${slug}`;
    const storagePath = `location-images/toronto-${Date.now()}-${slug}.${ext}`;

    const coinImageUrl = await uploadToSupabase(
      supabase,
      storagePath,
      downloaded.buffer,
      downloaded.contentType
    );

    if (!coinImageUrl) {
      console.warn(`${rowLabel}: image upload failed, skipping.`);
      skipped += 1;
      continue;
    }

    const address = row.address?.trim() || '';
    const description = row.quote?.slice(0, DESCRIPTION_MAX_LENGTH) || null;

    // Geocode address
    let latitude: number;
    let longitude: number;
    const coords = await geocodeAddress(address, mapboxToken);
    if (coords) {
      [longitude, latitude] = coords;
    } else {
      console.warn(`${rowLabel}: geocoding failed, using Toronto city center.`);
      latitude = 43.6532;
      longitude = -79.3832;
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
      type: row.category?.trim() || null,
      event_url: null,
      context: JSON.stringify({
        city: 'Toronto',
        country: 'Canada',
        recommendedBy: row.recommendedBy || null,
        created_at: new Date().toISOString(),
      }),
      coin_image_url: coinImageUrl,
      creator_wallet_address: CREATOR_WALLET,
      creator_username: CREATOR_USERNAME,
      is_visible: true,
    };

    const { error } = await supabase
      .from('locations')
      .upsert(payload, { onConflict: 'place_id' });

    if (error) {
      console.error(`${rowLabel}: insert failed:`, error.message);
      failed += 1;
    } else {
      console.log(`✓ ${rowLabel}: inserted (${placeId})`);
      inserted += 1;
    }
  }

  console.log(
    `\nDone. Inserted/updated: ${inserted}, skipped (no image): ${skipped}, failed: ${failed}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
