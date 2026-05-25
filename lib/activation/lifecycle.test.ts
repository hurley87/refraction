import { describe, it, expect } from 'vitest';
import { canActivationAcceptUserRedemptionFlow } from '@/lib/activation/lifecycle';

const window = {
  starts_at: '2026-06-01T12:00:00.000Z',
  ends_at: '2026-06-30T12:00:00.000Z',
};

describe('canActivationAcceptUserRedemptionFlow', () => {
  it('returns true only for active status inside the window', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'active', ...window },
        now
      )
    ).toBe(true);
  });

  it('returns false for draft', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow({ status: 'draft', ...window }, now)
    ).toBe(false);
  });

  it('returns false for paused', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'paused', ...window },
        now
      )
    ).toBe(false);
  });

  it('returns false for ended', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow({ status: 'ended', ...window }, now)
    ).toBe(false);
  });

  it('returns false before starts_at', () => {
    const now = new Date('2026-05-01T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'active', ...window },
        now
      )
    ).toBe(false);
  });

  it('returns false at or after ends_at', () => {
    const atEnd = new Date('2026-06-30T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'active', ...window },
        atEnd
      )
    ).toBe(false);
    const after = new Date('2026-07-01T00:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'active', ...window },
        after
      )
    ).toBe(false);
  });

  it('returns true at starts_at boundary', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    expect(
      canActivationAcceptUserRedemptionFlow(
        { status: 'active', ...window },
        now
      )
    ).toBe(true);
  });
});
