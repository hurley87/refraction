import sharp from 'sharp';

export const LOCATION_IMAGE_CACHE_CONTROL = '31536000';
export const LOCATION_IMAGE_FULL_MAX_EDGE = 1200;
export const LOCATION_IMAGE_THUMB_SIZE = 128;
export const LOCATION_IMAGE_WEBP_QUALITY = 80;

export type ProcessedLocationImages = {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
};

/** Resize and compress a location image into full + pin thumbnail WebP buffers. */
export async function processLocationImageInput(
  input: Buffer
): Promise<ProcessedLocationImages> {
  const oriented = sharp(input).rotate();

  const fullBuffer = await oriented
    .clone()
    .resize(LOCATION_IMAGE_FULL_MAX_EDGE, LOCATION_IMAGE_FULL_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: LOCATION_IMAGE_WEBP_QUALITY })
    .toBuffer();

  const thumbBuffer = await sharp(input)
    .rotate()
    .resize(LOCATION_IMAGE_THUMB_SIZE, LOCATION_IMAGE_THUMB_SIZE, {
      fit: 'cover',
    })
    .webp({ quality: LOCATION_IMAGE_WEBP_QUALITY })
    .toBuffer();

  return { fullBuffer, thumbBuffer };
}

export function buildLocationImageStoragePaths(baseId: string): {
  fullPath: string;
  thumbPath: string;
} {
  return {
    fullPath: `uploads/${baseId}.webp`,
    thumbPath: `uploads/${baseId}-thumb.webp`,
  };
}

export function createLocationImageBaseId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
