import { describe, it, expect } from 'vitest';
import type { SpendExperience } from '@/lib/types';
import {
  assertSpendExperienceOpenForSessions,
  computeSpendSessionExpiresAt,
} from './spend-experience-guard';

const baseExp: SpendExperience = {
  id: 'e1',
  title: 'Test',
  description: null,
  event_id: null,
  status: 'active',
  spend_rail: 'base_usdc',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x0000000000000000000000000000000000000001',
  receiving_wallet_address: '0x0000000000000000000000000000000000000002',
  privy_server_wallet_id: null,
  server_wallet_address: null,
  server_wallet_chain: null,
  server_wallet_created_at: null,
  spend_create_idempotency_key: null,
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2026-12-31T23:59:59.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('assertSpendExperienceOpenForSessions', () => {
  it('rejects draft', () => {
    const r = assertSpendExperienceOpenForSessions(
      { ...baseExp, status: 'draft' },
      new Date('2026-06-01T12:00:00.000Z')
    );
    expect(r.ok).toBe(false);
  });

  it('rejects before start', () => {
    const r = assertSpendExperienceOpenForSessions(
      baseExp,
      new Date('2025-12-01T12:00:00.000Z')
    );
    expect(r.ok).toBe(false);
  });

  it('rejects after end', () => {
    const r = assertSpendExperienceOpenForSessions(
      baseExp,
      new Date('2027-01-01T12:00:00.000Z')
    );
    expect(r.ok).toBe(false);
  });

  it('accepts active within window', () => {
    const r = assertSpendExperienceOpenForSessions(
      baseExp,
      new Date('2026-06-01T12:00:00.000Z')
    );
    expect(r).toEqual({ ok: true });
  });
});

describe('computeSpendSessionExpiresAt', () => {
  it('uses experience end when before 24h cap', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    const end = new Date('2026-06-01T20:00:00.000Z');
    const exp = { ...baseExp, end_time: end.toISOString() };
    const out = computeSpendSessionExpiresAt(exp, now);
    expect(out.getTime()).toBe(end.getTime());
  });
});
