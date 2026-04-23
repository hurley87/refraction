import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkAdminPermission } from '@/lib/db/admin';
import {
  adminListGuides,
  createGuide,
  ensureUniqueGuideSlug,
} from '@/lib/db/guides';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

const createSchema = z.object({
  kind: z.enum(['city_guide', 'editorial']),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  titleHint: z.string().min(1).max(200).optional(),
});

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || `guide-${Date.now()}`
  );
}

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    const guides = await adminListGuides();
    return apiSuccess({ guides });
  } catch (error) {
    console.error('Failed to list guides', error);
    return apiError('Failed to list guides', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    const json = await request.json();
    const payload = createSchema.parse(json);

    const hint =
      payload.slug?.trim() ||
      slugify(
        payload.titleHint ||
          (payload.kind === 'editorial' ? 'editorial' : 'city-guide')
      );

    const slug = await ensureUniqueGuideSlug(hint);
    const guide = await createGuide({ kind: payload.kind, slug });
    return apiSuccess({ guide });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    console.error('Failed to create guide', error);
    return apiError('Failed to create guide', 500);
  }
}
