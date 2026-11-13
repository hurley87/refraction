import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IrlCardWaitlistSignup } from '@/lib/db/irl-card-waitlist';

const mocks = vi.hoisted(() => ({
  isIrlCardWelcomeEmailConfigured: vi.fn(),
  isIrlCardListConfigured: vi.fn(),
  sendIrlCardWelcomeEmail: vi.fn(),
  addIrlCardListSubscriber: vi.fn(),
  claimWelcomeSend: vi.fn(),
  markWelcomeSent: vi.fn(),
  markWelcomeFailed: vi.fn(),
  markListSynced: vi.fn(),
  markListFailed: vi.fn(),
}));

vi.mock('@/lib/campaign-monitor/transactional', () => ({
  isIrlCardWelcomeEmailConfigured: mocks.isIrlCardWelcomeEmailConfigured,
  isIrlCardListConfigured: mocks.isIrlCardListConfigured,
  sendIrlCardWelcomeEmail: mocks.sendIrlCardWelcomeEmail,
  addIrlCardListSubscriber: mocks.addIrlCardListSubscriber,
}));
vi.mock('@/lib/db/irl-card-waitlist', () => ({
  LIST_SYNC_MAX_ATTEMPTS: 5,
  claimWelcomeSend: mocks.claimWelcomeSend,
  markWelcomeSent: mocks.markWelcomeSent,
  markWelcomeFailed: mocks.markWelcomeFailed,
  markListSynced: mocks.markListSynced,
  markListFailed: mocks.markListFailed,
}));
vi.mock('@/lib/monitoring/capture-handled-exception', () => ({
  captureHandledException: vi.fn(),
}));

import { deliverWaitlistFollowUps } from '@/lib/irl-card/waitlist-delivery';

const ORIGIN = 'https://www.irl.energy';

function makeSignup(
  overrides: Partial<IrlCardWaitlistSignup> = {}
): IrlCardWaitlistSignup {
  return {
    id: 'signup-1',
    email: 'fan@example.com',
    emailNormalized: 'fan@example.com',
    countryId: 'country-1',
    geoCityId: 'geo-1',
    countryIso2: 'CA',
    cityName: 'Toronto',
    alreadyUsesIrl: true,
    playerId: null,
    privyUserId: null,
    marketingConsent: true,
    welcomeEmailStatus: 'pending',
    welcomeEmailAttempts: 0,
    listSyncStatus: 'pending',
    listSyncAttempts: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isIrlCardWelcomeEmailConfigured.mockReturnValue(true);
  mocks.isIrlCardListConfigured.mockReturnValue(true);
  mocks.claimWelcomeSend.mockImplementation(async () => makeSignup());
  mocks.sendIrlCardWelcomeEmail.mockResolvedValue({ ok: true });
  mocks.addIrlCardListSubscriber.mockResolvedValue({ ok: true });
});

describe('deliverWaitlistFollowUps', () => {
  it('sends the welcome email with explore and share links, then syncs the list', async () => {
    const outcome = await deliverWaitlistFollowUps(makeSignup(), ORIGIN);

    expect(outcome).toEqual({ welcome: 'sent', list: 'synced' });
    expect(mocks.sendIrlCardWelcomeEmail).toHaveBeenCalledWith({
      email: 'fan@example.com',
      exploreUrl: expect.stringContaining(`${ORIGIN}/interactive-map`),
      shareUrl: expect.stringContaining(`${ORIGIN}/irl-card/waitlist`),
    });
    expect(mocks.markWelcomeSent).toHaveBeenCalledWith('signup-1');
    expect(mocks.addIrlCardListSubscriber).toHaveBeenCalledWith({
      email: 'fan@example.com',
      city: 'Toronto',
      countryIso2: 'CA',
      alreadyUsesIrl: true,
    });
    expect(mocks.markListSynced).toHaveBeenCalledWith('signup-1', 1);
  });

  it('sends only once when two deliveries race for the same signup', async () => {
    let claimed = false;
    mocks.claimWelcomeSend.mockImplementation(async () => {
      if (claimed) return null;
      claimed = true;
      return makeSignup();
    });

    const [first, second] = await Promise.all([
      deliverWaitlistFollowUps(makeSignup({ marketingConsent: false }), ORIGIN),
      deliverWaitlistFollowUps(makeSignup({ marketingConsent: false }), ORIGIN),
    ]);

    expect(mocks.sendIrlCardWelcomeEmail).toHaveBeenCalledTimes(1);
    expect([first.welcome, second.welcome].sort()).toEqual(['sent', 'skipped']);
  });

  it('does not claim or send when the welcome email was already sent', async () => {
    const outcome = await deliverWaitlistFollowUps(
      makeSignup({ welcomeEmailStatus: 'sent', marketingConsent: false }),
      ORIGIN
    );

    expect(outcome.welcome).toBe('skipped');
    expect(mocks.claimWelcomeSend).not.toHaveBeenCalled();
    expect(mocks.sendIrlCardWelcomeEmail).not.toHaveBeenCalled();
  });

  it('leaves the welcome pending without spending an attempt when not configured', async () => {
    mocks.isIrlCardWelcomeEmailConfigured.mockReturnValue(false);

    const outcome = await deliverWaitlistFollowUps(makeSignup(), ORIGIN);

    expect(outcome.welcome).toBe('skipped');
    expect(mocks.claimWelcomeSend).not.toHaveBeenCalled();
  });

  it('records a failed welcome send for retry', async () => {
    mocks.sendIrlCardWelcomeEmail.mockResolvedValue({
      ok: false,
      retryable: true,
      error: 'Campaign Monitor 503',
    });

    const outcome = await deliverWaitlistFollowUps(makeSignup(), ORIGIN);

    expect(outcome.welcome).toBe('failed');
    expect(mocks.markWelcomeFailed).toHaveBeenCalledWith(
      'signup-1',
      'Campaign Monitor 503'
    );
    expect(mocks.markWelcomeSent).not.toHaveBeenCalled();
  });

  it('never throws when the email provider throws', async () => {
    mocks.claimWelcomeSend.mockRejectedValue(new Error('rpc down'));

    await expect(
      deliverWaitlistFollowUps(makeSignup(), ORIGIN)
    ).resolves.toMatchObject({ welcome: 'failed' });
  });

  it('skips list sync without marketing consent', async () => {
    const outcome = await deliverWaitlistFollowUps(
      makeSignup({ marketingConsent: false, listSyncStatus: 'not_requested' }),
      ORIGIN
    );

    expect(outcome.list).toBe('skipped');
    expect(mocks.addIrlCardListSubscriber).not.toHaveBeenCalled();
  });

  it('skips list sync once it already synced or ran out of attempts', async () => {
    await deliverWaitlistFollowUps(
      makeSignup({ listSyncStatus: 'synced', welcomeEmailStatus: 'sent' }),
      ORIGIN
    );
    await deliverWaitlistFollowUps(
      makeSignup({
        listSyncStatus: 'failed',
        listSyncAttempts: 5,
        welcomeEmailStatus: 'sent',
      }),
      ORIGIN
    );

    expect(mocks.addIrlCardListSubscriber).not.toHaveBeenCalled();
  });

  it('counts retryable list failures and exhausts non-retryable ones', async () => {
    mocks.addIrlCardListSubscriber.mockResolvedValueOnce({
      ok: false,
      retryable: true,
      error: 'timeout',
    });
    await deliverWaitlistFollowUps(
      makeSignup({
        welcomeEmailStatus: 'sent',
        listSyncAttempts: 1,
        listSyncStatus: 'failed',
      }),
      ORIGIN
    );
    expect(mocks.markListFailed).toHaveBeenLastCalledWith('signup-1', 2);

    mocks.addIrlCardListSubscriber.mockResolvedValueOnce({
      ok: false,
      retryable: false,
      error: 'invalid email',
    });
    await deliverWaitlistFollowUps(
      makeSignup({ welcomeEmailStatus: 'sent' }),
      ORIGIN
    );
    expect(mocks.markListFailed).toHaveBeenLastCalledWith('signup-1', 5);
  });
});
