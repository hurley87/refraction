import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  listCities,
  createCity,
  updateCity,
  deleteCity,
} from '@/lib/db/cities';

const cityFields = z.object({
  name: z.string().min(1, 'Name is required'),
  country: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim() : null)),
  aliases: z
    .array(z.string())
    .default([])
    .transform((values) =>
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    ),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const cityUpdateSchema = cityFields.extend({
  id: z.string().uuid('Invalid city ID'),
});

/** GET /api/admin/cities — list all cities (including inactive) */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    const cities = await listCities();
    return apiSuccess(cities);
  } catch (e) {
    console.error('Failed to list cities:', e);
    return apiError('Failed to load cities', 500);
  }
}

/** POST /api/admin/cities — create a new city */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = cityFields.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const created = await createCity(parsed.data);
    return apiSuccess(created, 'City created', 201);
  } catch (e) {
    console.error('Failed to create city:', e);
    return apiError('Failed to create city', 500);
  }
}

/** PUT /api/admin/cities — update an existing city (id in body) */
export async function PUT(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = cityUpdateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { id, ...fields } = parsed.data;
  try {
    const updated = await updateCity(id, fields);
    return apiSuccess(updated);
  } catch (e) {
    console.error('Failed to update city:', e);
    return apiError('Failed to update city', 500);
  }
}

/** DELETE /api/admin/cities — delete a city (id in body) */
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
    .object({ id: z.string().uuid('Invalid city ID') })
    .safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await deleteCity(parsed.data.id);
    return apiSuccess({ deleted: parsed.data.id });
  } catch (e) {
    console.error('Failed to delete city:', e);
    return apiError('Failed to delete city', 500);
  }
}
