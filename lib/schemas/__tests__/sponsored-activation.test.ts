import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import {
  adminCreateSponsoredActivationRequestSchema,
  createSponsoredActivationSchema,
  updateSponsoredActivationSchema,
} from '../sponsored-activation';

/** Valid EVM-format address for schema tests (avoids repo allowlisted production contract literals). */
const SAMPLE_EVM_CONTRACT = '0x2222222222222222222222222222222222222222';
const STELLAR_A = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const STELLAR_B = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/** Strict `eligibility_config` (IRL-57) — use in create/update schema tests. */
const sampleEligibilityConfig = {
  max_events_per_user: 100,
  max_events_per_user_per_day: 20,
  required_checkpoint_ids: ['checkpoint-a'],
};

const validTime = {
  starts_at: '2026-06-01T12:00:00.000Z',
  ends_at: '2026-06-30T12:00:00.000Z',
};

describe('createSponsoredActivationSchema', () => {
  it('accepts a valid Base rail config with EIP-55-normalized wallets', () => {
    const campaign = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
    const venue = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'pr-summer',
      title: 'Public Records',
      sponsor_name: 'Acme',
      max_redemptions: 500,
      ...validTime,
      eligibility_config: { ...sampleEligibilityConfig, min_tier: 1 },
      campaign_wallet_address: campaign,
      venue_settlement_wallet_address: venue,
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.campaign_wallet_address).toBe(
        getAddress(campaign as `0x${string}`)
      );
      expect(r.data.venue_settlement_wallet_address).toBe(
        getAddress(venue as `0x${string}`)
      );
      expect(r.data.usdc_asset_config.contract_address).toBe(
        getAddress(SAMPLE_EVM_CONTRACT as `0x${string}`)
      );
    }
  });

  it('accepts a valid Stellar rail config', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'stellar',
      slug: 'pr-stellar',
      title: 'Stellar pilot',
      sponsor_name: 'Acme',
      max_usdc_budget: 1000,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: STELLAR_A,
      venue_settlement_wallet_address: STELLAR_B,
      usdc_asset_config: {
        asset_code: 'USDC',
        issuer: STELLAR_B,
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.settlement_rail).toBe('stellar');
      expect(r.data.campaign_wallet_address).toBe(STELLAR_A);
    }
  });

  it('rejects Stellar G-address on base rail', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: STELLAR_A,
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(false);
  });

  it('rejects EVM 0x address on stellar rail', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'stellar',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      venue_settlement_wallet_address: STELLAR_B,
      usdc_asset_config: {
        asset_code: 'USDC',
        issuer: STELLAR_B,
      },
    });
    expect(r.success).toBe(false);
  });

  it('rejects equal campaign and venue Stellar wallets', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'stellar',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: STELLAR_A,
      venue_settlement_wallet_address: STELLAR_A,
      usdc_asset_config: {
        asset_code: 'USDC',
        issuer: STELLAR_B,
      },
    });
    expect(r.success).toBe(false);
  });

  it('rejects equal campaign and venue wallets (EVM-aware)', () => {
    const addr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: addr,
      venue_settlement_wallet_address: addr.toLowerCase(),
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(false);
  });

  it('requires at least one of max_redemptions or max_usdc_budget on create', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(false);
  });

  it('rejects time window when ends_at is not after starts_at', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      starts_at: '2026-06-30T12:00:00.000Z',
      ends_at: '2026-06-01T12:00:00.000Z',
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(false);
  });

  it('rejects nested reward_items on create', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: sampleEligibilityConfig,
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
      reward_items: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown keys in eligibility_config on create', () => {
    const r = createSponsoredActivationSchema.safeParse({
      settlement_rail: 'base',
      slug: 'x',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      eligibility_config: { ...sampleEligibilityConfig, unknown_key: true },
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      usdc_asset_config: { contract_address: SAMPLE_EVM_CONTRACT },
    });
    expect(r.success).toBe(false);
  });
});

describe('adminCreateSponsoredActivationRequestSchema', () => {
  it('accepts Base create without campaign_wallet_address, slug, or usdc_asset_config', () => {
    const r = adminCreateSponsoredActivationRequestSchema.safeParse({
      settlement_rail: 'base',
      title: 'Public Records',
      sponsor_name: 'Acme',
      max_redemptions: 100,
      ...validTime,
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.eligibility_config.required_checkpoint_ids).toEqual([]);
    }
  });

  it('accepts Stellar create without campaign_wallet_address, slug, or usdc_asset_config', () => {
    const r = adminCreateSponsoredActivationRequestSchema.safeParse({
      settlement_rail: 'stellar',
      title: 'Public Records Stellar',
      sponsor_name: 'Acme',
      max_redemptions: 100,
      ...validTime,
      venue_settlement_wallet_address:
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
    });
    expect(r.success).toBe(true);
  });

  it('rejects slug on admin create (strict)', () => {
    const r = adminCreateSponsoredActivationRequestSchema.safeParse({
      settlement_rail: 'base',
      slug: 'pr-admin',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    });
    expect(r.success).toBe(false);
  });

  it('rejects extra campaign_wallet_address (strict)', () => {
    const r = adminCreateSponsoredActivationRequestSchema.safeParse({
      settlement_rail: 'base',
      title: 't',
      sponsor_name: 's',
      max_redemptions: 1,
      ...validTime,
      venue_settlement_wallet_address:
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    });
    expect(r.success).toBe(false);
  });
});

describe('updateSponsoredActivationSchema', () => {
  it('rejects unknown keys in eligibility_config on update', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      eligibility_config: { ...sampleEligibilityConfig, extra: 1 },
    });
    expect(r.success).toBe(false);
  });

  it('does not require caps on update', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      title: 'Only title',
    });
    expect(r.success).toBe(true);
  });

  it('accepts clearing both caps on update', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      max_redemptions: null,
      max_usdc_budget: null,
    });
    expect(r.success).toBe(true);
  });

  it('requires settlement_rail when updating wallet fields', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    });
    expect(r.success).toBe(false);
  });
});
