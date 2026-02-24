import { NextRequest } from 'next/server';
import { updateSpendItem, deleteSpendItem } from '@/lib/db/spend';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { updateSpendItemSchema } from '@/lib/schemas/spend';
import { ZodError } from 'zod';

// PUT /api/admin/spend/[id] - Update a spend item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    const body = await request.json();
    const validated = updateSpendItemSchema.parse(body);

    // Normalize empty image_url to null
    const updates = {
      ...validated,
      ...(validated.image_url !== undefined && {
        image_url: validated.image_url || null,
      }),
    };

    const item = await updateSpendItem(params.id, updates);
    return apiSuccess({ item });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError(error);
    }
    console.error('Error updating spend item:', error);
    return apiError('Failed to update spend item', 500);
  }
}

// DELETE /api/admin/spend/[id] - Delete a spend item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    await deleteSpendItem(params.id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Error deleting spend item:', error);
    return apiError('Failed to delete spend item', 500);
  }
}
