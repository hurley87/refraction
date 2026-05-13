import { describe, it, expect, afterEach } from 'vitest';
import { readSpendRailReconcileEnvConfig } from '@/lib/spend/reconcile-spend-rail-pending-operations';

describe('readSpendRailReconcileEnvConfig', () => {
  afterEach(() => {
    delete process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS;
    delete process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS;
    delete process.env.SPEND_RAIL_CRON_BATCH_SIZE;
  });

  it('returns defaults when env vars are unset', () => {
    expect(readSpendRailReconcileEnvConfig()).toEqual({
      minAgeSeconds: 60,
      backoffSeconds: 120,
      batchSize: 25,
    });
  });

  it('parses overrides', () => {
    process.env.SPEND_RAIL_CRON_MIN_AGE_SECONDS = '30';
    process.env.SPEND_RAIL_CRON_BACKOFF_SECONDS = '45';
    process.env.SPEND_RAIL_CRON_BATCH_SIZE = '10';
    expect(readSpendRailReconcileEnvConfig()).toEqual({
      minAgeSeconds: 30,
      backoffSeconds: 45,
      batchSize: 10,
    });
  });

  it('caps oversized batch', () => {
    process.env.SPEND_RAIL_CRON_BATCH_SIZE = '9999';
    expect(readSpendRailReconcileEnvConfig().batchSize).toBe(500);
  });
});
