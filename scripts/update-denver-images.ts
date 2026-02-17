/**
 * Update Denver locations in Supabase so coin_image_url points to images in public/denver.
 * Filename convention: slugify(locationName) + extension, e.g. "Tibet Imports" -> tibet-imports.jpg
 *
 * Run after placing images in public/denver: npx tsx scripts/update-denver-images.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const EXTENSION_ORDER = ['.jpg', '.jpeg', '.png', '.webp'];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://irl.energy';
  return url.replace(/\/$/, '');
}

/**
 * Build map: slugified file basename -> filename (so "Tibet Imports.jpg" is keyed by "tibet-imports").
 * Also adds key without " the " for variants like "Sarah Sze at the Denver Art Museum".
 * Prefer first extension in EXTENSION_ORDER when duplicate basenames exist.
 */
function buildSlugToFileMap(dirPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return map;
  }
  const files = fs.readdirSync(dirPath);
  const byBasename = new Map<string, string[]>();
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;
    const basename = path.basename(file, ext);
    if (!byBasename.has(basename)) {
      byBasename.set(basename, []);
    }
    byBasename.get(basename)!.push(file);
  }
  for (const [basename, filenames] of Array.from(byBasename.entries())) {
    const sorted = filenames.sort(
      (a, b) =>
        EXTENSION_ORDER.indexOf(path.extname(a).toLowerCase()) -
        EXTENSION_ORDER.indexOf(path.extname(b).toLowerCase())
    );
    const filename = sorted[0];
    const slug = slugify(basename);
    map.set(slug, filename);
    const slugNoThe = slugify(basename.replace(/\s+the\s+/gi, ' '));
    if (slugNoThe !== slug) map.set(slugNoThe, filename);
  }
  return map;
}

/**
 * Find filename for location: exact slug match, then prefix match (file slug is prefix of location slug).
 */
function findFilenameForLocation(
  locationSlug: string,
  slugToFile: Map<string, string>
): string | null {
  if (slugToFile.has(locationSlug)) return slugToFile.get(locationSlug)!;
  let best: string | null = null;
  let bestLen = 0;
  for (const [fileSlug, filename] of Array.from(slugToFile.entries())) {
    if (locationSlug.startsWith(fileSlug) && fileSlug.length > bestLen) {
      best = filename;
      bestLen = fileSlug.length;
    }
  }
  return best;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
    process.exit(1);
  }

  const baseUrl = getBaseUrl();
  const denverDir = path.join(process.cwd(), 'public', 'denver');
  const slugToFile = buildSlugToFileMap(denverDir);

  if (slugToFile.size === 0) {
    console.log('No image files found in public/denver. Exiting.');
    process.exit(0);
  }
  console.log(
    `Found ${slugToFile.size} image(s) in public/denver. Base URL: ${baseUrl}`
  );

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: locations, error: fetchError } = await supabase
    .from('locations')
    .select('id, name, place_id')
    .like('place_id', 'denver-%');

  if (fetchError) {
    console.error('Failed to fetch Denver locations:', fetchError.message);
    process.exit(1);
  }

  const list = locations ?? [];
  let updated = 0;
  let skipped = 0;

  const nameToFileOverrides: Record<string, string> = {
    'Reset Mind & Body': 'Rest Mind and Body.jpeg',
    'Fort Greene': 'Fort Greene.JPG',
  };

  for (const loc of list) {
    const slug = slugify(loc.name);
    const filename =
      nameToFileOverrides[loc.name] ??
      findFilenameForLocation(slug, slugToFile);
    if (!filename) {
      console.log(`No image for "${loc.name}" (slug: ${slug})`);
      skipped += 1;
      continue;
    }
    const imageUrl = `${baseUrl}/denver/${encodeURIComponent(filename)}`;
    const { error: updateError } = await supabase
      .from('locations')
      .update({ coin_image_url: imageUrl })
      .eq('id', loc.id);

    if (updateError) {
      console.error(`Update failed for "${loc.name}":`, updateError.message);
      skipped += 1;
    } else {
      console.log(`Updated "${loc.name}" -> ${filename}`);
      updated += 1;
    }
  }

  console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
