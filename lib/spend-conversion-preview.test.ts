import { describe, it, expect } from 'vitest';
import { buildSpendEligibilityPreview } from '@/lib/spend-conversion-preview';
import type {
  SpendExperience,
  SpendSession,
  Player,
  PointConversion,
} from '@/lib/types';

const exp = (over: Partial<SpendExperience> = {}): SpendExperience => ({
  id: 'e1',
  title: 'T',
  description: null,
  event_id: null,
  status: 'active',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2030-01-01T00:00:00.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const sess = (over: Partial<SpendSession> = {}): SpendSession => ({
  id: 's1',
  spend_experience_id: 'e1',
  user_id: 'u1',
  wallet_address: '0x3333333333333333333333333333333333333333',
  status: 'created',
  qr_token_hash: null,
  created_at: '2026-06-01T12:00:00.000Z',
  expires_at: '2026-06-02T12:00:00.000Z',
  completed_at: null,
  ...over,
});

const player = (pts: number): Player => ({
  id: 1,
  wallet_address: '0x3333333333333333333333333333333333333333',
  total_points: pts,
  email: null,
  username: null,
  created_at: '',
  updated_at: '',
});

describe('buildSpendEligibilityPreview', () => {
  const now = new Date('2026-06-01T15:00:00.000Z');

  it('returns eligible when balances ok', () => {
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(6000),
      pointConversion: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 10,
      now,
    });
    expect(r.status).toBe('eligible');
    expect(r.preview?.pointsRequired).toBe(5000);
    expect(r.preview?.usdcAmount).toBe(5);
  });

  it('returns insufficient_points', () => {
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(100),
      pointConversion: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 100,
      now,
    });
    expect(r.status).toBe('insufficient_points');
  });

  it('returns treasury_insufficient when balance too low', () => {
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(6000),
      pointConversion: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 2,
      now,
    });
    expect(r.status).toBe('treasury_insufficient');
  });

  it('returns already_converted when funded on another session', () => {
    const funded: PointConversion = {
      id: 'c1',
      spend_experience_id: 'e1',
      spend_session_id: 'other',
      user_id: 'u1',
      points_deducted: 5000,
      usdc_amount: 5,
      status: 'funded',
      treasury_wallet_address: '0x1',
      user_wallet_address: '0x3',
      funding_tx_hash: '0x',
      idempotency_key: null,
      created_at: '',
      completed_at: '',
      failed_reason: null,
    };
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(6000),
      pointConversion: null,
      fundedConversionForOtherSession: funded,
      treasuryUsdcBalance: 100,
      now,
    });
    expect(r.status).toBe('already_converted');
  });
});
