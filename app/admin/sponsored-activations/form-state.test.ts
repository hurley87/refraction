import { describe, it, expect } from 'vitest';
import {
  emptySponsoredActivationForm,
  formStateToCreatePayload,
} from './form-state';
import { DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG } from '@/lib/schemas/activation-eligibility-config';

const VENUE_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const;

describe('formStateToCreatePayload', () => {
  it('builds a base rail create body with default eligibility', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      title: 'Drink credit',
      sponsor_name: 'Public Records',
      venue_settlement_wallet_address: VENUE_WALLET,
    };
    const payload = formStateToCreatePayload(form);
    expect(payload.settlement_rail).toBe('base');
    expect(payload.eligibility_config).toEqual(
      DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG
    );
    expect(payload).not.toHaveProperty('usdc_asset_config');
  });

  it('requires at least one cap', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      title: 't',
      sponsor_name: 's',
      venue_settlement_wallet_address: VENUE_WALLET,
      max_redemptions: '',
      max_usdc_budget: '',
    };
    expect(() => formStateToCreatePayload(form)).toThrow(/max redemptions/i);
  });
});
