import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cron/spend-rail-reconcile/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/spend/reconcile-spend-rail-pending-operations', () => ({
  runSpendRailReconciliationCron: vi.fn().mockResolvedValue({
    candidateSessions: 0,
    processedSessions: 0,
    olderThanIso: '2020-01-01T00:00:00.000Z',
    batchSize: 25,
  }),
}));

describe('GET /api/cron/spend-rail-reconcile', () => {
  const prevCron = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = prevCron;
  });

  it('returns 401 without Bearer secret', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/spend-rail-reconcile'
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong secret', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/spend-rail-reconcile',
      {
        headers: { Authorization: 'Bearer wrong' },
      }
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with cron payload when authorized', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/spend-rail-reconcile',
      {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { candidateSessions: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.candidateSessions).toBe(0);
  });
});
