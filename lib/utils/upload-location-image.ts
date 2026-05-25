import { supabase } from '@/lib/db/client';
import {
  buildLocationImageStoragePaths,
  createLocationImageBaseId,
  LOCATION_IMAGE_CACHE_CONTROL,
  processLocationImageInput,
} from '@/lib/utils/process-location-image';

export type UploadedLocationImageUrls = {
  url: string;
  imageUrl: string;
  thumbnailUrl: string;
};

/** Process, upload full + thumb WebP variants, and return public URLs. */
export async function uploadProcessedLocationImages(
  input: Buffer,
  options?: { baseId?: string; folder?: 'uploads' | 'location-images' }
): Promise<UploadedLocationImageUrls> {
  const baseId = options?.baseId ?? createLocationImageBaseId();
  const folder = options?.folder ?? 'uploads';
  const { fullBuffer, thumbBuffer } = await processLocationImageInput(input);

  const fullPath =
    folder === 'uploads'
      ? buildLocationImageStoragePaths(baseId).fullPath
      : `${folder}/${baseId}.webp`;
  const thumbPath =
    folder === 'uploads'
      ? buildLocationImageStoragePaths(baseId).thumbPath
      : `${folder}/${baseId}-thumb.webp`;

  const uploadOpts = {
    contentType: 'image/webp' as const,
    cacheControl: LOCATION_IMAGE_CACHE_CONTROL,
    upsert: false,
  };

  const { error: fullError } = await supabase.storage
    .from('images')
    .upload(fullPath, fullBuffer, uploadOpts);

  if (fullError) {
    throw new Error(fullError.message || 'Failed to upload full image');
  }

  const { error: thumbError } = await supabase.storage
    .from('images')
    .upload(thumbPath, thumbBuffer, uploadOpts);

  if (thumbError) {
    await supabase.storage.from('images').remove([fullPath]);
    throw new Error(thumbError.message || 'Failed to upload thumbnail');
  }

  const { data: fullUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(fullPath);
  const { data: thumbUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(thumbPath);

  const url = fullUrlData.publicUrl;
  return {
    url,
    imageUrl: url,
    thumbnailUrl: thumbUrlData.publicUrl,
  };
}
