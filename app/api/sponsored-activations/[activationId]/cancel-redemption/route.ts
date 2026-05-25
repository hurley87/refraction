import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { runCancelActivationRedemption } from '@/lib/activation/cancel-redemption';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { activationId: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const activationKey = params.activationId?.trim() ?? '';

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const result = await runCancelActivationRedemption({
    request,
    activationKey,
    body,
  });
  if (!result.ok) return result.response;
  return apiSuccess(result.body);
}
