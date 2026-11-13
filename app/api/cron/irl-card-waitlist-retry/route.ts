import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { listRetryableSignups } from '@/lib/db/irl-card-waitlist';
import { deliverWaitlistFollowUps } from '@/lib/irl-card/waitlist-delivery';

export const dynamic = 'force-dynamic';

const RETRY_BATCH_SIZE = 50;

/** Vercel Cron: retries IRL Card welcome emails and list syncs; auth via `CRON_SECRET` Bearer. */
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
    const signups = await listRetryableSignups(RETRY_BATCH_SIZE);
    const totals = {
      processed: signups.length,
      welcomeSent: 0,
      welcomeFailed: 0,
      listSynced: 0,
      listFailed: 0,
    };

    for (const signup of signups) {
      const outcome = await deliverWaitlistFollowUps(signup);
      if (outcome.welcome === 'sent') totals.welcomeSent += 1;
      if (outcome.welcome === 'failed') totals.welcomeFailed += 1;
      if (outcome.list === 'synced') totals.listSynced += 1;
      if (outcome.list === 'failed') totals.listFailed += 1;
    }

    return apiSuccess(totals);
  } catch (e) {
    console.error('irl-card-waitlist-retry cron:', e);
    return apiError('IRL Card waitlist retry failed', 500);
  }
}
