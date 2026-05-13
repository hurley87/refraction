import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { runSpendRailReconciliationCron } from '@/lib/spend/reconcile-spend-rail-pending-operations';

/** Vercel Cron (IRL-22): bounded spend-rail reconciliation; auth via `CRON_SECRET` Bearer. */
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
    const data = await runSpendRailReconciliationCron();
    return apiSuccess(data);
  } catch (e) {
    console.error('spend-rail-reconcile cron:', e);
    return apiError('Reconciliation failed', 500);
  }
}
