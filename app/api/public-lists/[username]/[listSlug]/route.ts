import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolvePublicListShareLookup } from '@/lib/db/player-custom-lists';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { normalizeUsername } from '@/lib/username';

const paramsSchema = z.object({
  username: z.string().min(1),
  listSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid list slug'),
});

/** GET /api/public-lists/[username]/[listSlug] — shareable public list lookup. */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; listSlug: string } }
) {
  try {
    const parsed = paramsSchema.safeParse({
      username: normalizeUsername(params.username),
      listSlug: params.listSlug.trim().toLowerCase(),
    });
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const resolved = await resolvePublicListShareLookup(
      parsed.data.username,
      parsed.data.listSlug
    );

    if (!resolved) {
      return apiError('List not found', 404);
    }

    if (resolved.kind === 'redirect') {
      const target = new URL(request.url);
      target.pathname = `/map/${resolved.username}/${resolved.listSlug}`;
      return NextResponse.redirect(target, 301);
    }

    return apiSuccess({ list: resolved.list });
  } catch (error) {
    console.error('Failed to fetch public list by slug:', error);
    return apiError('Failed to fetch list', 500);
  }
}
