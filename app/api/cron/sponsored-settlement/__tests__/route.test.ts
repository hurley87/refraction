import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cron/sponsored-settlement/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/activation/run-sponsored-settlement-cron', () => ({
  runSponsoredSettlementCron: vi.fn().mockResolvedValue({
    batchSize: 25,
    candidateSettlements: 0,
    stellar: { processed: 0, confirmed: 0, failed: 0, skipped: 0 },
    base: { processed: 0, message: 'deferred_to_irl_56' },
  }),
}));

describe('GET /api/cron/sponsored-settlement', () => {
  const prevCron = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = prevCron;
  });

  it('returns 401 without Bearer secret', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/sponsored-settlement'
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with cron payload when authorized', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/sponsored-settlement',
      {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { stellar: { processed: number } };
    };
    expect(body.success).toBe(true);
    expect(body.data.stellar.processed).toBe(0);
  });
});
