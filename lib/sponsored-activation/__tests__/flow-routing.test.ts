import { describe, it, expect } from 'vitest';
import type { ActivationRedemptionRow } from '@/lib/db/activation-redemptions';
import {
  pickPrimaryActivationRedemption,
  resolveSponsoredActivationBaseScreen,
} from '@/lib/sponsored-activation/flow-routing';

const baseRedemption = {
  id: 'r1',
  activation_id: 'a1',
  reward_item_id: 'item-1',
  user_id: 1,
  eligibility_event_id: 'e1',
  idempotency_key: 'k1',
  points_spent: 100,
  usdc_amount_snapshot: null,
  purchase_confirmed_at: null,
  redeemed_at: null,
  cancelled_reason: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} satisfies Omit<ActivationRedemptionRow, 'status'>;

describe('resolveSponsoredActivationBaseScreen', () => {
  it('maps available to confirm', () => {
    expect(resolveSponsoredActivationBaseScreen('available')).toBe('confirm');
  });

  it('maps ready_to_redeem to success_swipe', () => {
    expect(resolveSponsoredActivationBaseScreen('ready_to_redeem')).toBe(
      'success_swipe'
    );
  });

  it('maps settlement_pending to redeemed', () => {
    expect(resolveSponsoredActivationBaseScreen('settlement_pending')).toBe(
      'redeemed'
    );
  });

  it('maps expired and cancelled', () => {
    expect(resolveSponsoredActivationBaseScreen('expired')).toBe('expired');
    expect(resolveSponsoredActivationBaseScreen('cancelled')).toBe('cancelled');
  });
});

describe('pickPrimaryActivationRedemption', () => {
  it('prefers redeemed-like over available for the same reward item', () => {
    const rows: ActivationRedemptionRow[] = [
      { ...baseRedemption, id: 'a', status: 'available' },
      { ...baseRedemption, id: 'b', status: 'settlement_pending' },
    ];
    const picked = pickPrimaryActivationRedemption(rows, 'item-1');
    expect(picked?.id).toBe('b');
  });
});
