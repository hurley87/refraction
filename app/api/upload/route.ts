import { supabase } from '@/lib/db/client';
import { z, ZodError } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/response';
import { uploadProcessedLocationImages } from '@/lib/utils/upload-location-image';

// Validate the incoming request body
const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base64Image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle FormData (from interactive-map and admin perks) - upload to Supabase Storage
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return apiError('No file provided', 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const urls = await uploadProcessedLocationImages(
        Buffer.from(arrayBuffer)
      );

      return apiSuccess(urls);
    }
    // Handle JSON with base64 (for interactive-map location creation)
    else {
      const body = await request.json();
      const validatedData = uploadSchema.parse(body);

      // Extract base64 data (handle both data:image/...;base64,xxx and plain base64)
      let base64Data = validatedData.base64Image;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      // Convert base64 to buffer
      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(base64Data, 'base64');
      } catch (bufferError) {
        console.error('Buffer conversion error:', bufferError);
        return apiError('Invalid base64 image data', 400);
      }

      if (imageBuffer.length === 0) {
        return apiError('Empty image data', 400);
      }

      const urls = await uploadProcessedLocationImages(imageBuffer, {
        folder: 'location-images',
      });

      return apiSuccess(urls);
    }
  } catch (error: unknown) {
    console.error('Upload error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return apiError(
        `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
        400
      );
    }

    return apiError(
      error instanceof Error ? error.message : 'Failed to upload image',
      500
    );
  }
}
