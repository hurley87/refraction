import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkAdminPermission } from '@/lib/db/admin';
import {
  adminGetGuide,
  deleteGuide,
  ensureUniqueGuideSlug,
  replaceGuideContributors,
  updateGuide,
} from '@/lib/db/guides';
import { editorialBlocksSchema } from '@/lib/guides/block-schema';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

const contributorSchema = z.object({
  position: z.number().int().min(0),
  name: z.string().min(1),
  bio: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  photo_alt: z.string().nullable().optional(),
  instagram_href: z.string().nullable().optional(),
});

const patchSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  kind: z.enum(['city_guide', 'editorial']).optional(),
  title_prefix: z.string().nullable().optional(),
  city_name: z.string().nullable().optional(),
  title_primary: z.string().nullable().optional(),
  title_secondary: z.string().nullable().optional(),
  hero_image_url: z.string().optional(),
  hero_image_alt: z.string().optional(),
  lead_headline: z.string().nullable().optional(),
  lead_paragraphs: z.array(z.string()).optional(),
  location_list_id: z.string().uuid().nullable().optional(),
  map_image_url: z.string().nullable().optional(),
  map_image_alt: z.string().nullable().optional(),
  blocks: z.unknown().optional(),
  is_published: z.boolean().optional(),
  published_at: z.union([z.string(), z.null()]).optional(),
  is_featured: z.boolean().optional(),
  card_preview: z.string().nullable().optional(),
  card_image_url: z.string().nullable().optional(),
  card_image_alt: z.string().nullable().optional(),
  featured_people: z.array(z.string()).optional(),
  contributors: z.array(contributorSchema).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    const detail = await adminGetGuide(params.id);
    if (!detail) {
      return apiError('Not found', 404);
    }
    return apiSuccess(detail);
  } catch (error) {
    console.error('Failed to load guide', error);
    return apiError('Failed to load guide', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    const json = await request.json();
    const payload = patchSchema.parse(json);

    const { contributors, blocks, slug: nextSlug, ...guidePatch } = payload;

    if (blocks !== undefined && blocks !== null) {
      const parsed = editorialBlocksSchema.safeParse(blocks);
      if (!parsed.success) {
        return apiValidationError(parsed.error);
      }
    }

    let slugToSet = nextSlug;
    if (nextSlug) {
      slugToSet = await ensureUniqueGuideSlug(nextSlug, params.id);
    }

    const updated = await updateGuide(params.id, {
      ...guidePatch,
      ...(slugToSet !== undefined ? { slug: slugToSet } : {}),
      ...(blocks !== undefined ? { blocks } : {}),
    });

    if (contributors) {
      await replaceGuideContributors(
        params.id,
        contributors.map((c) => ({
          position: c.position,
          name: c.name,
          bio: c.bio ?? null,
          photo_url: c.photo_url ?? null,
          photo_alt: c.photo_alt ?? null,
          instagram_href: c.instagram_href ?? null,
        }))
      );
    }

    const detail = await adminGetGuide(params.id);
    return apiSuccess(detail ?? { guide: updated, contributors: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    console.error('Failed to update guide', error);
    return apiError('Failed to update guide', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    await deleteGuide(params.id);
    return apiSuccess({ ok: true });
  } catch (error) {
    console.error('Failed to delete guide', error);
    return apiError('Failed to delete guide', 500);
  }
}
