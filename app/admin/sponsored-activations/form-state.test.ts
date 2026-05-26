import { describe, it, expect } from 'vitest';
import {
  emptySponsoredActivationForm,
  formStateToCreatePayload,
} from './form-state';

describe('formStateToCreatePayload', () => {
  it('builds a base rail create body with eligibility', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      slug: 'pr-drink',
      title: 'Drink credit',
      sponsor_name: 'Public Records',
      venue_settlement_wallet_address:
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      required_checkpoint_ids: 'cp-1, cp-2',
    };
    const payload = formStateToCreatePayload(form);
    expect(payload.settlement_rail).toBe('base');
    expect(payload.slug).toBe('pr-drink');
    expect(payload.eligibility_config.required_checkpoint_ids).toEqual([
      'cp-1',
      'cp-2',
    ]);
    if (payload.settlement_rail === 'base') {
      expect(payload.usdc_asset_config.contract_address).toBeTruthy();
    }
  });

  it('requires at least one cap', () => {
    const form = {
      ...emptySponsoredActivationForm(),
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      venue_settlement_wallet_address:
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      max_redemptions: '',
      max_usdc_budget: '',
      required_checkpoint_ids: 'cp-1',
    };
    expect(() => formStateToCreatePayload(form)).toThrow(/max redemptions/i);
  });
});
