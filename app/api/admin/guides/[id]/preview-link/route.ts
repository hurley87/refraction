import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';
import { adminGetGuide } from '@/lib/db/guides';
import {
  createGuidePreviewToken,
  isGuidePreviewSecretConfigured,
} from '@/lib/guides/preview-token';
import { apiSuccess, apiError } from '@/lib/api/response';

function readHrefForGuide(
  slug: string,
  kind: 'city_guide' | 'editorial'
): string {
  return kind === 'editorial'
    ? `/city-guides/editorial/${slug}`
    : `/city-guides/${slug}`;
}

/**
 * Returns a time-limited preview URL (with `?preview=…` token) for an unpublished or published guide.
 * Requires `x-user-email` for an admin. Signing uses `GUIDE_PREVIEW_SECRET` or, in production, a
 * key derived from `PRIVY_APP_SECRET`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized', 403);
    }

    if (!isGuidePreviewSecretConfigured()) {
      return apiError(
        'Guide preview is not configured (set GUIDE_PREVIEW_SECRET or PRIVY_APP_SECRET)',
        500
      );
    }

    const detail = await adminGetGuide(params.id);
    if (!detail) {
      return apiError('Not found', 404);
    }

    const { guide } = detail;
    const token = createGuidePreviewToken(guide.id, guide.slug);
    if (!token) {
      return apiError('Could not create preview link', 500);
    }

    const path = readHrefForGuide(guide.slug, guide.kind);
    const url = `${path}?preview=${encodeURIComponent(token)}`;
    return apiSuccess({ url, path, expiresInSeconds: 60 * 60 });
  } catch (error) {
    console.error('Failed to build preview link', error);
    return apiError('Failed to build preview link', 500);
  }
}
