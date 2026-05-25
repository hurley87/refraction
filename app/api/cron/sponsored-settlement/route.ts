import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { runSponsoredSettlementCron } from '@/lib/activation/run-sponsored-settlement-cron';

/** Vercel Cron (IRL-58): sponsored activation settlement; Stellar branch in this issue. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return apiError('Cron is not configured', 500);
  }

  const auth = request.headers.get('authorization')?.trim();
  if (auth !== `Bearer ${secret}`) {
    return apiError('Unauthorized', 401);
  }

  try {
    const data = await runSponsoredSettlementCron();
    return apiSuccess(data);
  } catch (e) {
    console.error('sponsored-settlement cron:', e);
    return apiError('Sponsored settlement failed', 500);
  }
}
