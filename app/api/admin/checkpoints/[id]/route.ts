import { NextRequest } from 'next/server';
import {
  getCheckpointById,
  updateCheckpoint,
  deleteCheckpoint,
} from '@/lib/db/checkpoints';
import { syncSpendItemForCheckpoint } from '@/lib/db/spend';
import { updateCheckpointRequestSchema } from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { supabase } from '@/lib/db/client';

interface RouteParams {
  params: { id: string };
}

type SupportedImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

const IMAGE_EXTENSION_BY_MIME: Record<SupportedImageMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const detectImageMimeType = (
  bytes: Uint8Array
): SupportedImageMimeType | null => {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (isPng) return 'image/png';

  // JPEG: FF D8 FF
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  if (isJpeg) return 'image/jpeg';

  // WebP: "RIFF"...."WEBP"
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (isWebp) return 'image/webp';

  return null;
};

// GET /api/admin/checkpoints/[id] - Get a checkpoint by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const checkpoint = await getCheckpointById(params.id);

    if (!checkpoint) {
      return apiError('Checkpoint not found', 404);
    }

    return apiSuccess({ checkpoint });
  } catch (error) {
    console.error('Error fetching checkpoint:', error);
    return apiError('Failed to fetch checkpoint', 500);
  }
}

// PATCH /api/admin/checkpoints/[id] - Update a checkpoint
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const existingCheckpoint = await getCheckpointById(params.id);
    if (!existingCheckpoint) {
      return apiError('Checkpoint not found', 404);
    }

    const contentType = request.headers.get('content-type') || '';
    let rawUpdates: Record<string, unknown> = {};
    let uploadedImageUrl: string | null | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('partner_image') as File | null;

      const name = formData.get('name');
      const description = formData.get('description');
      const login_cta_text = formData.get('login_cta_text');
      const chain_type = formData.get('chain_type');
      const checkpoint_mode = formData.get('checkpoint_mode');
      const points_value = formData.get('points_value');
      const is_active = formData.get('is_active');

      if (name !== null) rawUpdates.name = String(name);
      if (description !== null)
        rawUpdates.description = String(description) || null;
      if (login_cta_text !== null)
        rawUpdates.login_cta_text = String(login_cta_text).trim() || null;
      if (chain_type !== null) rawUpdates.chain_type = String(chain_type);
      if (checkpoint_mode !== null)
        rawUpdates.checkpoint_mode = String(checkpoint_mode);
      if (points_value !== null) rawUpdates.points_value = Number(points_value);
      if (is_active !== null) {
        rawUpdates.is_active = String(is_active) === 'true';
      }

      if (file && file.size > 0) {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          return apiError('File size exceeds 5MB limit.', 400);
        }

        const arrayBuffer = await file.arrayBuffer();
        const detectedMimeType = detectImageMimeType(new Uint8Array(arrayBuffer));
        if (!detectedMimeType) {
          return apiError(
            'Invalid file type. Only PNG, JPEG, and WebP images are allowed.',
            400
          );
        }

        const fileExt = IMAGE_EXTENSION_BY_MIME[detectedMimeType];
        const filePath = `checkpoint-partners/${params.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, arrayBuffer, {
            contentType: detectedMimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          return apiError(uploadError.message || 'Failed to upload image', 500);
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        uploadedImageUrl = urlData.publicUrl;
      }
    } else {
      rawUpdates = await request.json();
    }

    if (uploadedImageUrl !== undefined) {
      rawUpdates.partner_image_url = uploadedImageUrl;
    }

    const validationResult = updateCheckpointRequestSchema.safeParse(rawUpdates);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const nextMode =
      validationResult.data.checkpoint_mode ??
      existingCheckpoint.checkpoint_mode ??
      'checkin';
    const nextChain = validationResult.data.chain_type ?? existingCheckpoint.chain_type;
    if (nextMode === 'spend' && nextChain !== 'evm') {
      return apiError('Spend checkpoints currently require EVM wallets.', 400);
    }

    const checkpoint = await updateCheckpoint(params.id, validationResult.data);
    await syncSpendItemForCheckpoint(checkpoint);

    return apiSuccess({ checkpoint }, 'Checkpoint updated successfully');
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update checkpoint';
    if (errorMessage.includes('checkpoint_mode')) {
      return apiError(errorMessage, 400);
    }
    return apiError('Failed to update checkpoint', 500);
  }
}

// DELETE /api/admin/checkpoints/[id] - Delete a checkpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    await deleteCheckpoint(params.id);

    return apiSuccess({ deleted: true }, 'Checkpoint deleted successfully');
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return apiError('Failed to delete checkpoint', 500);
  }
}
