import { describe, it, expect } from 'vitest';
import {
  emptySponsoredActivationForm,
  formStateToCreatePayload,
} from './form-state';
import { DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG } from '@/lib/schemas/activation-eligibility-config';

const VENUE_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const;

function minimalBaseCreateForm(
  overrides: Partial<ReturnType<typeof emptySponsoredActivationForm>> = {}
) {
  return {
    ...emptySponsoredActivationForm(),
    title: 'Drink credit',
    sponsor_name: 'Public Records',
    venue_settlement_wallet_address: VENUE_WALLET,
    ...overrides,
  };
}

describe('formStateToCreatePayload', () => {
  it('builds a base rail create body with default eligibility', () => {
    const form = minimalBaseCreateForm();
    const payload = formStateToCreatePayload(form);
    expect(payload.settlement_rail).toBe('base');
    expect(payload.eligibility_config).toEqual(
      DEFAULT_SPONSORED_ACTIVATION_ELIGIBILITY_CONFIG
    );
    expect(payload).not.toHaveProperty('usdc_asset_config');
  });

  it('defaults payment_token to USDC on base rail', () => {
    const payload = formStateToCreatePayload(minimalBaseCreateForm());
    expect(payload).toMatchObject({ payment_token: 'USDC' });
  });

  it('includes the selected payment_token (CADD) on base rail', () => {
    const payload = formStateToCreatePayload(
      minimalBaseCreateForm({ payment_token: 'CADD' })
    );
    expect(payload).toMatchObject({ payment_token: 'CADD' });
  });

  it('omits payment_token on stellar rail', () => {
    const payload = formStateToCreatePayload(
      minimalBaseCreateForm({ settlement_rail: 'stellar' })
    );
    expect(payload).not.toHaveProperty('payment_token');
  });

  it('builds a Tempo create body without a Base payment token', () => {
    const payload = formStateToCreatePayload(
      minimalBaseCreateForm({ settlement_rail: 'tempo' })
    );
    expect(payload.settlement_rail).toBe('tempo');
    expect(payload).not.toHaveProperty('payment_token');
  });

  it('includes trimmed description when set', () => {
    const payload = formStateToCreatePayload(
      minimalBaseCreateForm({ description: '  Free drink with check-in  ' })
    );
    expect(payload.description).toBe('Free drink with check-in');
  });

  it('sends null description when empty', () => {
    const payload = formStateToCreatePayload(
      minimalBaseCreateForm({ description: '   ' })
    );
    expect(payload.description).toBeNull();
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
