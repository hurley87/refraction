import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SpendSession } from '@/lib/types';

const mockReconcileForSession = vi.fn().mockResolvedValue({ ok: true });

vi.mock(
  '@/lib/spend/reconcile-spend-rail-pending-operations',
  async (importOriginal) => {
    const mod =
      await importOriginal<
        typeof import('@/lib/spend/reconcile-spend-rail-pending-operations')
      >();
    return {
      ...mod,
      reconcileSpendRailPendingOperationsForSession: (
        ...args: Parameters<
          typeof mod.reconcileSpendRailPendingOperationsForSession
        >
      ) => mockReconcileForSession(...args),
    };
  }
);

import {
  maybeReconcileSpendRailOnAuthorizedSessionRead,
  spendSessionStatusAllowsOpportunisticRailReconcile,
} from '@/lib/spend/opportunistic-spend-rail-reconcile-on-read';
import { computeSpendRailReconcileOlderThanIso } from '@/lib/spend/reconcile-spend-rail-pending-operations';

function baseSession(over: Partial<SpendSession>): SpendSession {
  return {
    id: 'sess-1',
    spend_experience_id: 'exp-1',
    user_id: 'privy-1',
    wallet_address: '0xabc',
    spend_rail: 'base_usdc',
    rail_user_wallet_address: '0xabc',
    status: 'created',
    qr_token_hash: null,
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2026-01-02T00:00:00.000Z',
    completed_at: null,
    ...over,
  };
}

describe('spendSessionStatusAllowsOpportunisticRailReconcile', () => {
  it('is false for terminal session statuses', () => {
    expect(
      spendSessionStatusAllowsOpportunisticRailReconcile('payment_complete')
    ).toBe(false);
    expect(spendSessionStatusAllowsOpportunisticRailReconcile('failed')).toBe(
      false
    );
    expect(spendSessionStatusAllowsOpportunisticRailReconcile('expired')).toBe(
      false
    );
  });

  it('is true for non-terminal statuses', () => {
    expect(spendSessionStatusAllowsOpportunisticRailReconcile('created')).toBe(
      true
    );
    expect(
      spendSessionStatusAllowsOpportunisticRailReconcile('payment_pending')
    ).toBe(true);
  });
});

describe('maybeReconcileSpendRailOnAuthorizedSessionRead', () => {
  beforeEach(() => {
    mockReconcileForSession.mockClear();
    delete process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS;
    delete process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS;
  });

  afterEach(() => {
    delete process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS;
    delete process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS;
  });

  it('skips reconcileSpendRailPendingOperationsForSession for terminal sessions', async () => {
    await maybeReconcileSpendRailOnAuthorizedSessionRead({
      spendSessionId: 'sess-1',
      session: baseSession({ status: 'payment_complete' }),
    });
    expect(mockReconcileForSession).not.toHaveBeenCalled();
  });

  it('invokes reconcile with olderThanIso matching cron policy', async () => {
    const nowMs = 1_700_000_000_000;
    await maybeReconcileSpendRailOnAuthorizedSessionRead({
      spendSessionId: 'sess-1',
      session: baseSession({ status: 'payment_pending' }),
      nowMs,
    });
    expect(mockReconcileForSession).toHaveBeenCalledTimes(1);
    const arg = mockReconcileForSession.mock.calls[0][0];
    expect(arg.spendSessionId).toBe('sess-1');
    expect(arg.distinctId).toBeUndefined();
    const cfg = {
      minAgeSeconds: 60,
      backoffSeconds: 120,
      batchSize: 25,
    };
    expect(arg.olderThanIso).toBe(
      computeSpendRailReconcileOlderThanIso(nowMs, cfg)
    );
  });

  it('honours env-backed reconcile config for the cutoff', async () => {
    process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS = '300';
    process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS = '10';
    const nowMs = 9_000_000;
    await maybeReconcileSpendRailOnAuthorizedSessionRead({
      spendSessionId: 'sess-1',
      session: baseSession({ status: 'conversion_pending' }),
      nowMs,
    });
    const arg = mockReconcileForSession.mock.calls[0][0];
    expect(arg.olderThanIso).toBe(
      computeSpendRailReconcileOlderThanIso(nowMs, {
        minAgeSeconds: 300,
        backoffSeconds: 10,
        batchSize: 25,
      })
    );
  });
});
