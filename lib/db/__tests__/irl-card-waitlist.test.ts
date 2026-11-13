import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));

import {
  WELCOME_EMAIL_MAX_ATTEMPTS,
  claimWelcomeSend,
  markWelcomeSent,
  normalizeWaitlistEmail,
  upsertWaitlistSignup,
} from '@/lib/db/irl-card-waitlist';

const row = {
  id: 'signup-1',
  email: 'Fan@Example.com',
  email_normalized: 'fan@example.com',
  country_id: 'country-1',
  geo_city_id: 'geo-1',
  country_iso2: 'ca',
  city_name: 'Toronto',
  already_uses_irl: false,
  player_id: null,
  privy_user_id: null,
  marketing_consent: true,
  welcome_email_status: 'sending',
  welcome_email_attempts: 1,
  list_sync_status: 'pending',
  list_sync_attempts: 0,
  created_at: '2026-11-13T00:00:00.000Z',
};

const signupInput = {
  email: '  Fan@Example.com ',
  countryId: 'country-1',
  geoCityId: 'geo-1',
  countryIso2: 'ca',
  cityName: 'Toronto',
  alreadyUsesIrl: false,
  playerId: null,
  privyUserId: null,
  marketingConsent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizeWaitlistEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeWaitlistEmail('  Fan@Example.COM ')).toBe(
      'fan@example.com'
    );
  });
});

describe('claimWelcomeSend', () => {
  it('returns the claimed signup when the atomic claim wins', async () => {
    mocks.rpc.mockResolvedValue({ data: [row], error: null });

    const claimed = await claimWelcomeSend('signup-1');

    expect(mocks.rpc).toHaveBeenCalledWith('claim_irl_card_welcome_send', {
      p_id: 'signup-1',
      p_max_attempts: WELCOME_EMAIL_MAX_ATTEMPTS,
      p_stale_after: '10 minutes',
    });
    expect(claimed).toMatchObject({
      id: 'signup-1',
      countryIso2: 'CA',
      welcomeEmailStatus: 'sending',
    });
  });

  it('returns null when another caller already holds the claim', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(claimWelcomeSend('signup-1')).resolves.toBeNull();
  });

  it('only lets one of two concurrent claims win', async () => {
    let held = false;
    mocks.rpc.mockImplementation(async () => {
      if (held) return { data: [], error: null };
      held = true;
      return { data: [row], error: null };
    });

    const results = await Promise.all([
      claimWelcomeSend('signup-1'),
      claimWelcomeSend('signup-1'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('throws on RPC errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(claimWelcomeSend('signup-1')).rejects.toThrow('boom');
  });
});

describe('markWelcomeSent', () => {
  it('only updates a row that is still being sent', async () => {
    const eqStatus = vi.fn().mockResolvedValue({ error: null });
    const eqId = vi.fn(() => ({ eq: eqStatus }));
    const update = vi.fn(() => ({ eq: eqId }));
    mocks.from.mockReturnValue({ update });

    await markWelcomeSent('signup-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ welcome_email_status: 'sent' })
    );
    expect(eqId).toHaveBeenCalledWith('id', 'signup-1');
    expect(eqStatus).toHaveBeenCalledWith('welcome_email_status', 'sending');
  });
});

describe('upsertWaitlistSignup', () => {
  it('inserts on normalized email and reports a new signup', async () => {
    const select = vi.fn().mockResolvedValue({ data: [row], error: null });
    const upsert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ upsert });

    const result = await upsertWaitlistSignup(signupInput);

    expect(result.created).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'Fan@Example.com',
        email_normalized: 'fan@example.com',
        country_iso2: 'CA',
        list_sync_status: 'pending',
      }),
      { onConflict: 'email_normalized', ignoreDuplicates: true }
    );
  });

  it('returns the existing row unchanged on a duplicate email', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const upsert = vi.fn(() => ({ select }));
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const lookupSelect = vi.fn(() => ({ eq }));
    mocks.from
      .mockReturnValueOnce({ upsert })
      .mockReturnValueOnce({ select: lookupSelect });

    const result = await upsertWaitlistSignup({
      ...signupInput,
      email: 'FAN@example.com',
    });

    expect(result.created).toBe(false);
    expect(result.signup.id).toBe('signup-1');
    expect(eq).toHaveBeenCalledWith('email_normalized', 'fan@example.com');
  });

  it('does not request list sync without consent', async () => {
    const select = vi.fn().mockResolvedValue({ data: [row], error: null });
    const upsert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ upsert });

    await upsertWaitlistSignup({ ...signupInput, marketingConsent: false });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        marketing_consent: false,
        consent_at: null,
        list_sync_status: 'not_requested',
      }),
      expect.anything()
    );
  });
});
