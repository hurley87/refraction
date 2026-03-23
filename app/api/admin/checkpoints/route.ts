import { NextRequest } from 'next/server';
import { listAllCheckpoints, createCheckpoint } from '@/lib/db/checkpoints';
import { syncSpendItemForCheckpoint } from '@/lib/db/spend';
import { createCheckpointRequestSchema } from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth';
import { supabase } from '@/lib/db/client';

// GET /api/admin/checkpoints - Get all checkpoints
export async function GET(request: NextRequest) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const checkpoints = await listAllCheckpoints();
    return apiSuccess({ checkpoints });
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    return apiError('Failed to fetch checkpoints', 500);
  }
}

// POST /api/admin/checkpoints - Create a new checkpoint
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const adminEmail = adminCheck.user?.email || undefined;
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart/form-data (with image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('partner_image') as File | null;

      // Extract and validate form fields
      const name = formData.get('name') as string;
      const description = formData.get('description') as string | null;
      const login_cta_text = formData.get('login_cta_text') as string | null;
      const chain_type = formData.get('chain_type') as string;
      const checkpoint_mode =
        (formData.get('checkpoint_mode') as string | null) || 'checkin';
      const points_value = formData.get('points_value');
      const is_active = formData.get('is_active');
      const background_gradient = formData.get('background_gradient') as string | null;
      const font_family = formData.get('font_family') as string | null;
      const font_color = formData.get('font_color') as string | null;
      const footer_title = formData.get('footer_title') as string | null;
      const footer_description = formData.get('footer_description') as string | null;
      const cta_text = formData.get('cta_text') as string | null;
      const cta_url = formData.get('cta_url') as string | null;

      // Normalize form data for Zod validation
      const formFields = {
        name: name || '',
        description: description || undefined,
        login_cta_text: login_cta_text?.trim() || null,
        chain_type,
        checkpoint_mode,
        points_value: points_value ? Number(points_value) : 100,
        is_active: is_active === 'true' || String(is_active) === 'true',
        background_gradient: background_gradient?.trim() || null,
        font_family: font_family?.trim() || null,
        font_color: font_color?.trim() || null,
        footer_title: footer_title?.trim() || null,
        footer_description: footer_description?.trim() || null,
        cta_text: cta_text?.trim() || null,
        cta_url: cta_url?.trim() || null,
      };

      const validationResult =
        createCheckpointRequestSchema.safeParse(formFields);

      if (!validationResult.success) {
        return apiValidationError(validationResult.error);
      }

      if (
        validationResult.data.checkpoint_mode === 'spend' &&
        validationResult.data.chain_type !== 'evm'
      ) {
        return apiError('Spend checkpoints currently require EVM wallets.', 400);
      }

      // Generate checkpoint ID first (needed for storage path)
      const checkpointId = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      let partnerImageUrl: string | null = null;

      // Upload image if provided
      if (file && file.size > 0) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
        ];
        if (!allowedTypes.includes(file.type)) {
          return apiError(
            'Invalid file type. Only PNG, JPEG, and WebP images are allowed.',
            400
          );
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          return apiError('File size exceeds 5MB limit.', 400);
        }

        // Get file extension
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `checkpoint-partners/${checkpointId}.${fileExt}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          return apiError(uploadError.message || 'Failed to upload image', 500);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        partnerImageUrl = urlData.publicUrl;
      }

      // Create checkpoint with image URL
      const checkpoint = await createCheckpoint(
        {
          ...validationResult.data,
          partner_image_url: partnerImageUrl,
          created_by: adminEmail,
        },
        checkpointId
      );

      await syncSpendItemForCheckpoint(checkpoint);

      const checkpointUrl = `/c/${checkpoint.id}`;

      return apiSuccess(
        { checkpoint, url: checkpointUrl },
        `Checkpoint created! URL: ${checkpointUrl}`
      );
    } else {
      // Handle JSON (existing flow, no image)
      const body = await request.json();
      const validationResult = createCheckpointRequestSchema.safeParse(body);

      if (!validationResult.success) {
        return apiValidationError(validationResult.error);
      }

      if (
        validationResult.data.checkpoint_mode === 'spend' &&
        validationResult.data.chain_type !== 'evm'
      ) {
        return apiError('Spend checkpoints currently require EVM wallets.', 400);
      }

      const checkpoint = await createCheckpoint({
        ...validationResult.data,
        created_by: adminEmail,
      });

      await syncSpendItemForCheckpoint(checkpoint);

      const checkpointUrl = `/c/${checkpoint.id}`;

      return apiSuccess(
        { checkpoint, url: checkpointUrl },
        `Checkpoint created! URL: ${checkpointUrl}`
      );
    }
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkpoint';
    if (errorMessage.includes('checkpoint_mode')) {
      return apiError(errorMessage, 400);
    }
    return apiError('Failed to create checkpoint', 500);
  }
}
