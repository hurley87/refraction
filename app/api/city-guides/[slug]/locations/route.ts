import { NextRequest } from 'next/server';
import { getPrivyUserIdFromRequest } from '@/lib/api/privy';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getCityGuidePageData } from '@/lib/db/guides';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { slug: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = await getPrivyUserIdFromRequest(request);
  if (!userId) {
    return apiError('Unauthorized', 401);
  }

  const data = await getCityGuidePageData(params.slug, {
    locationAudience: 'full',
  });
  if (!data) {
    return apiError('City guide not found', 404);
  }

  return apiSuccess({
    locationSections: data.locationSections,
    locationContributorByPlaceId: Object.fromEntries(
      data.locationContributorByPlaceId
    ),
    contributorNames: data.contributorNames,
  });
}
