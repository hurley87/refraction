import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseRenderImageUrl } from '@/lib/metadata/request-base';

/** Shared canvas size for every IRL share card. */
export const OG_CARD_SIZE = { width: 1200, height: 630 } as const;

const FONT_REGULAR = join(
  process.cwd(),
  'public/fonts/Special Gothic Expanded Regular.otf'
);
const FONT_MEDIUM = join(
  process.cwd(),
  'public/fonts/SpecialSemi-ExpandedMedium.otf'
);
const LOGO_SVG = join(process.cwd(), 'public/irl-svg/irl-logo-new.svg');

const PHOTO_FETCH_TIMEOUT_MS = 5000;

export type OgCardFont = {
  name: string;
  data: Buffer;
  style: 'normal';
  weight: 400 | 500;
};

/** Font family name to use in card styles. */
export const OG_CARD_FONT_FAMILY = 'Special Gothic';

export async function loadOgCardFonts(): Promise<OgCardFont[]> {
  const [regular, medium] = await Promise.all([
    readFile(FONT_REGULAR),
    readFile(FONT_MEDIUM),
  ]);
  return [
    {
      name: OG_CARD_FONT_FAMILY,
      data: regular,
      style: 'normal',
      weight: 400,
    },
    {
      name: OG_CARD_FONT_FAMILY,
      data: medium,
      style: 'normal',
      weight: 500,
    },
  ];
}

/** IRL logo as an inline data URI, the only form Satori can render. */
export async function loadOgCardLogoDataUri(): Promise<string> {
  const svg = await readFile(LOGO_SVG);
  return `data:image/svg+xml;base64,${svg.toString('base64')}`;
}

/**
 * Inlines a card photo as a PNG/JPEG/GIF data URI.
 *
 * Satori only decodes those formats. Uploads are stored as WebP, so Supabase
 * URLs are converted through image transforms first (see `ogCardPhotoUrl`).
 * A slow host must not stall the card, so the fetch is time-boxed and any
 * failure falls back to the branded no-photo panel.
 */
export async function loadOgCardPhotoDataUri(
  url: string | null
): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!/image\/(png|jpeg|jpg|gif)\b/i.test(contentType)) return null;

    const mime = contentType.split(';')[0]?.trim() || 'image/jpeg';
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Photo URL Satori can decode (PNG/JPEG/GIF). Supabase WebP is converted via
 * image transforms; other WebP sources are skipped so the card can fall back.
 */
export function ogCardPhotoUrl(photoUrl: string | null): string | null {
  const trimmed = photoUrl?.trim();
  if (!trimmed) return null;

  try {
    const rendered = supabaseRenderImageUrl(trimmed);
    if (rendered) return rendered;
  } catch {
    return null;
  }

  if (/\.webp(?:$|\?)/i.test(trimmed)) return null;
  return trimmed;
}
