import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  spend_rail: 'base_usdc',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  privy_server_wallet_id: 'wallet_e1',
  server_wallet_address: '0x4444444444444444444444444444444444444444',
  server_wallet_chain: 'base-mainnet',
  server_wallet_created_at: '2026-01-01T00:00:00.000Z',
  spend_create_idempotency_key: 'idem-e1',
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
  spend_rail: 'base_usdc',
  rail_user_wallet_address: '0x3333333333333333333333333333333333333333',
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
      spendTransaction: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 10,
      userUsdcBalance: null,
      now,
    });
    expect(r.status).toBe('eligible');
    expect(r.preview?.pointsRequired).toBe(5000);
    expect(r.preview?.usdcAmount).toBe(5);
    expect(r.preview?.userUsdcBalance).toBeNull();
    expect(r.preview?.treasuryWalletAddress).toBe(
      '0x4444444444444444444444444444444444444444'
    );
    expect(r.preview?.receivingWalletAddress).toBe(
      '0x2222222222222222222222222222222222222222'
    );
  });

  it('returns insufficient_points', () => {
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(100),
      pointConversion: null,
      spendTransaction: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 100,
      userUsdcBalance: null,
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
      spendTransaction: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 2,
      userUsdcBalance: null,
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
      spend_rail: 'base_usdc',
      network: 'Base',
      asset_symbol: 'USDC',
      treasury_wallet_address: '0x1',
      user_wallet_address: '0x3',
      funding_tx_hash: '0x',
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '',
      completed_at: '',
      failed_reason: null,
      updated_at: '',
    };
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(6000),
      pointConversion: null,
      spendTransaction: null,
      fundedConversionForOtherSession: funded,
      treasuryUsdcBalance: 100,
      userUsdcBalance: null,
      now,
    });
    expect(r.status).toBe('already_converted');
  });

  it('returns ready_for_payment when conversion funded and no spend tx', () => {
    const conv: PointConversion = {
      id: 'c1',
      spend_experience_id: 'e1',
      spend_session_id: 's1',
      user_id: 'u1',
      points_deducted: 5000,
      usdc_amount: 5,
      status: 'funded',
      spend_rail: 'base_usdc',
      network: 'Base',
      asset_symbol: 'USDC',
      treasury_wallet_address: '0x1',
      user_wallet_address: '0x3',
      funding_tx_hash: '0xabc',
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '',
      completed_at: '',
      failed_reason: null,
      updated_at: '',
    };
    const r = buildSpendEligibilityPreview({
      session: sess({ status: 'conversion_complete' }),
      spendExperience: exp(),
      player: player(1000),
      pointConversion: conv,
      spendTransaction: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 100,
      userUsdcBalance: null,
      now,
    });
    expect(r.status).toBe('ready_for_payment');
  });

  it('returns payment_complete when spend transaction confirmed', () => {
    const conv: PointConversion = {
      id: 'c1',
      spend_experience_id: 'e1',
      spend_session_id: 's1',
      user_id: 'u1',
      points_deducted: 5000,
      usdc_amount: 5,
      status: 'funded',
      spend_rail: 'base_usdc',
      network: 'Base',
      asset_symbol: 'USDC',
      treasury_wallet_address: '0x1',
      user_wallet_address: '0x3',
      funding_tx_hash: '0xabc',
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '',
      completed_at: '',
      failed_reason: null,
      updated_at: '',
    };
    const r = buildSpendEligibilityPreview({
      session: sess({ status: 'payment_complete' }),
      spendExperience: exp(),
      player: player(1000),
      pointConversion: conv,
      spendTransaction: {
        id: 't1',
        spend_experience_id: 'e1',
        spend_session_id: 's1',
        user_id: 'u1',
        usdc_amount: 5,
        spend_rail: 'base_usdc',
        network: 'Base',
        asset_symbol: 'USDC',
        from_wallet_address: '0x3',
        to_wallet_address: '0x2',
        status: 'confirmed',
        payment_tx_hash: '0x' + 'a'.repeat(64),
        explorer_tx_url: null,
        idempotency_key: 'k',
        created_at: '',
        completed_at: '',
        failed_reason: null,
        updated_at: '',
      },
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 100,
      userUsdcBalance: null,
      now,
    });
    expect(r.status).toBe('payment_complete');
  });

  it('returns payment_complete when spend is confirmed even if Base rail is disabled', () => {
    const prev = process.env.SPEND_RAIL_BASE_USDC_ENABLED;
    process.env.SPEND_RAIL_BASE_USDC_ENABLED = 'false';
    try {
      const conv: PointConversion = {
        id: 'c1',
        spend_experience_id: 'e1',
        spend_session_id: 's1',
        user_id: 'u1',
        points_deducted: 5000,
        usdc_amount: 5,
        status: 'funded',
        spend_rail: 'base_usdc',
        network: 'Base',
        asset_symbol: 'USDC',
        treasury_wallet_address: '0x1',
        user_wallet_address: '0x3',
        funding_tx_hash: '0xabc',
        explorer_tx_url: null,
        idempotency_key: null,
        created_at: '',
        completed_at: '',
        failed_reason: null,
        updated_at: '',
      };
      const r = buildSpendEligibilityPreview({
        session: sess({ status: 'payment_complete' }),
        spendExperience: exp(),
        player: player(1000),
        pointConversion: conv,
        spendTransaction: {
          id: 't1',
          spend_experience_id: 'e1',
          spend_session_id: 's1',
          user_id: 'u1',
          usdc_amount: 5,
          spend_rail: 'base_usdc',
          network: 'Base',
          asset_symbol: 'USDC',
          from_wallet_address: '0x3',
          to_wallet_address: '0x2',
          status: 'confirmed',
          payment_tx_hash: '0x' + 'a'.repeat(64),
          explorer_tx_url: null,
          idempotency_key: 'k',
          created_at: '',
          completed_at: '',
          failed_reason: null,
          updated_at: '',
        },
        fundedConversionForOtherSession: null,
        treasuryUsdcBalance: 100,
        userUsdcBalance: null,
        now,
      });
      expect(r.status).toBe('payment_complete');
    } finally {
      if (prev === undefined) delete process.env.SPEND_RAIL_BASE_USDC_ENABLED;
      else process.env.SPEND_RAIL_BASE_USDC_ENABLED = prev;
    }
  });

  it('returns ready_for_payment_own_usdc when wallet has enough USDC (no conversion)', () => {
    const r = buildSpendEligibilityPreview({
      session: sess(),
      spendExperience: exp(),
      player: player(0),
      pointConversion: null,
      spendTransaction: null,
      fundedConversionForOtherSession: null,
      treasuryUsdcBalance: 0,
      userUsdcBalance: 5.5,
      now,
    });
    expect(r.status).toBe('ready_for_payment_own_usdc');
  });

  describe('stellar_usdc rail', () => {
    const prev: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const k of [
        'SPEND_RAIL_STELLAR_USDC_ENABLED',
        'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS',
        'NEXT_PUBLIC_STELLAR_NETWORK',
      ]) {
        prev[k] = process.env[k];
      }
      process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'true';
      process.env.SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS =
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC';
    });

    afterEach(() => {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    });

    it('allows ready_for_payment_own_usdc without Base treasury funding', () => {
      const r = buildSpendEligibilityPreview({
        session: sess({ spend_rail: 'stellar_usdc' }),
        spendExperience: exp({ spend_rail: 'stellar_usdc' }),
        player: player(0),
        pointConversion: null,
        spendTransaction: null,
        fundedConversionForOtherSession: null,
        treasuryUsdcBalance: null,
        userUsdcBalance: 10,
        now,
      });
      expect(r.status).toBe('ready_for_payment_own_usdc');
    });

    it('returns conversion_unsupported when points would fund but rail has no Privy treasury path', () => {
      const r = buildSpendEligibilityPreview({
        session: sess({ spend_rail: 'stellar_usdc' }),
        spendExperience: exp({ spend_rail: 'stellar_usdc' }),
        player: player(6000),
        pointConversion: null,
        spendTransaction: null,
        fundedConversionForOtherSession: null,
        treasuryUsdcBalance: 100,
        userUsdcBalance: null,
        now,
      });
      expect(r.status).toBe('conversion_unsupported');
    });

    it('returns insufficient_points when user lacks points and own USDC', () => {
      const r = buildSpendEligibilityPreview({
        session: sess({ spend_rail: 'stellar_usdc' }),
        spendExperience: exp({ spend_rail: 'stellar_usdc' }),
        player: player(100),
        pointConversion: null,
        spendTransaction: null,
        fundedConversionForOtherSession: null,
        treasuryUsdcBalance: 100,
        userUsdcBalance: null,
        now,
      });
      expect(r.status).toBe('insufficient_points');
    });
  });
});
