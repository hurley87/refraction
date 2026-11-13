import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  listRetryableSignups: vi.fn(),
  deliverWaitlistFollowUps: vi.fn(),
}));

vi.mock('@/lib/db/irl-card-waitlist', () => ({
  listRetryableSignups: mocks.listRetryableSignups,
}));
vi.mock('@/lib/irl-card/waitlist-delivery', () => ({
  deliverWaitlistFollowUps: mocks.deliverWaitlistFollowUps,
}));

import { GET } from '@/app/api/cron/irl-card-waitlist-retry/route';

const URL = 'http://localhost/api/cron/irl-card-waitlist-retry';

function request(auth?: string) {
  return new NextRequest(URL, {
    headers: auth ? { Authorization: auth } : {},
  });
}

describe('GET /api/cron/irl-card-waitlist-retry', () => {
  const prevCron = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = prevCron;
  });

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request('Bearer test-cron-secret'));
    expect(res.status).toBe(500);
    expect(mocks.listRetryableSignups).not.toHaveBeenCalled();
  });

  it('returns 401 without or with a wrong Bearer secret', async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request('Bearer wrong'))).status).toBe(401);
    expect(mocks.listRetryableSignups).not.toHaveBeenCalled();
  });

  it('retries each retryable signup and reports totals', async () => {
    mocks.listRetryableSignups.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
    mocks.deliverWaitlistFollowUps
      .mockResolvedValueOnce({ welcome: 'sent', list: 'synced' })
      .mockResolvedValueOnce({ welcome: 'failed', list: 'skipped' })
      .mockResolvedValueOnce({ welcome: 'skipped', list: 'failed' });

    const res = await GET(request('Bearer test-cron-secret'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.listRetryableSignups).toHaveBeenCalledWith(50);
    expect(mocks.deliverWaitlistFollowUps).toHaveBeenCalledTimes(3);
    expect(json.data).toEqual({
      processed: 3,
      welcomeSent: 1,
      welcomeFailed: 1,
      listSynced: 1,
      listFailed: 1,
    });
  });

  it('returns 500 when loading retryable signups fails', async () => {
    mocks.listRetryableSignups.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(request('Bearer test-cron-secret'));
    expect(res.status).toBe(500);
  });
});
