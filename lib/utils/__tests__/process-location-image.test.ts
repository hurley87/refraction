import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  LOCATION_IMAGE_THUMB_SIZE,
  processLocationImageInput,
} from '../process-location-image';

describe('processLocationImageInput', () => {
  it('returns WebP full and thumb buffers', async () => {
    const input = await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: { r: 120, g: 80, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const { fullBuffer, thumbBuffer } = await processLocationImageInput(input);

    const fullMeta = await sharp(fullBuffer).metadata();
    const thumbMeta = await sharp(thumbBuffer).metadata();

    expect(fullMeta.format).toBe('webp');
    expect(thumbMeta.format).toBe('webp');
    expect(
      Math.max(fullMeta.width ?? 0, fullMeta.height ?? 0)
    ).toBeLessThanOrEqual(1200);
    expect(thumbMeta.width).toBe(LOCATION_IMAGE_THUMB_SIZE);
    expect(thumbMeta.height).toBe(LOCATION_IMAGE_THUMB_SIZE);
    expect(fullBuffer.length).toBeLessThan(input.length);
  });
});
