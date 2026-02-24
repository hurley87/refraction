import { NextRequest } from 'next/server';
import { getSpendItems, createSpendItem } from '@/lib/db/spend';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { createSpendItemSchema } from '@/lib/schemas/spend';
import { ZodError } from 'zod';

// GET /api/admin/spend - List all spend items (active + inactive)
export async function GET(request: NextRequest) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    const items = await getSpendItems(false);
    return apiSuccess({ items });
  } catch (error) {
    console.error('Error fetching spend items:', error);
    return apiError('Failed to fetch spend items', 500);
  }
}

// POST /api/admin/spend - Create a new spend item
export async function POST(request: NextRequest) {
  try {
    const { isValid } = await requireAdmin(request);
    if (!isValid) return apiError('Unauthorized', 401);

    const body = await request.json();
    const validated = createSpendItemSchema.parse(body);

    // Normalize empty image_url to null
    const item = await createSpendItem({
      ...validated,
      image_url: validated.image_url || null,
      description: validated.description || null,
    });

    return apiSuccess({ item });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError(error);
    }
    console.error('Error creating spend item:', error);
    return apiError('Failed to create spend item', 500);
  }
}
