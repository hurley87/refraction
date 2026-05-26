import { describe, it, expect } from 'vitest';
import {
  emptySponsoredActivationForm,
  formStateToCreatePayload,
} from './form-state';
import { DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG } from '@/lib/schemas/activation-eligibility-config';

describe('formStateToCreatePayload', () => {
  it('builds a base rail create body with default eligibility', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      title: 'Drink credit',
      sponsor_name: 'Public Records',
      venue_settlement_wallet_address:
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    };
    const payload = formStateToCreatePayload(form);
    expect(payload.settlement_rail).toBe('base');
    expect(payload.eligibility_config).toEqual(
      DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG
    );
    if (payload.settlement_rail === 'base') {
      expect('usdc_asset_config' in payload).toBe(false);
    }
  });

  it('requires at least one cap', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      title: 't',
      sponsor_name: 's',
      venue_settlement_wallet_address:
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      max_redemptions: '',
      max_usdc_budget: '',
    };
    expect(() => formStateToCreatePayload(form)).toThrow(/max redemptions/i);
  });
});
