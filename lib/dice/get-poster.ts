import type { DiceImage } from './schemas';

/**
 * Pick the best poster URL from DICE event images.
 * Tolerates sparse arrays (null/undefined entries) from API or cache drift.
 */
export function getDiceEventPosterUrl(
  images: DiceImage[] | null | undefined
): string | null {
  if (!images?.length) return null;

  const definedImages = images.filter(
    (image): image is DiceImage => image != null
  );
  if (definedImages.length === 0) return null;

  const preferred =
    definedImages.find((image) => image.type === 'SQUARE') ?? definedImages[0];

  return preferred.url ?? null;
}
