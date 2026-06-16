import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/db/categories';

const categoryFields = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const categoryUpdateSchema = categoryFields.extend({
  id: z.string().uuid('Invalid category ID'),
});

/** GET /api/admin/categories — list all categories (including inactive) */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    const categories = await listCategories();
    return apiSuccess(categories);
  } catch (e) {
    console.error('Failed to list categories:', e);
    return apiError('Failed to load categories', 500);
  }
}

/** POST /api/admin/categories — create a new category */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = categoryFields.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const created = await createCategory(parsed.data);
    return apiSuccess(created, 'Category created', 201);
  } catch (e) {
    console.error('Failed to create category:', e);
    return apiError('Failed to create category', 500);
  }
}

/** PUT /api/admin/categories — update an existing category (id in body) */
export async function PUT(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { id, ...fields } = parsed.data;
  try {
    const updated = await updateCategory(id, fields);
    return apiSuccess(updated);
  } catch (e) {
    console.error('Failed to update category:', e);
    return apiError('Failed to update category', 500);
  }
}

/** DELETE /api/admin/categories — delete a category (id in body) */
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = z
    .object({ id: z.string().uuid('Invalid category ID') })
    .safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await deleteCategory(parsed.data.id);
    return apiSuccess({ deleted: parsed.data.id });
  } catch (e) {
    console.error('Failed to delete category:', e);
    return apiError('Failed to delete category', 500);
  }
}
