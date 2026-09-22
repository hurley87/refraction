import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminCreateSponsoredActivationRequestSchema,
  createSponsoredActivationSchema,
  settlementRailSchema,
  solanaAddressSchema,
  solanaUsdcAssetConfigSchema,
  sponsoredActivationSettlementBundleSchema,
  updateSponsoredActivationSchema,
} from '../sponsored-activation';
import { SOLANA_USDC_MINT_BY_CLUSTER } from '@/lib/activation/solana-config';

const SOLANA_CAMPAIGN = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const SOLANA_VENUE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const MAINNET_USDC = SOLANA_USDC_MINT_BY_CLUSTER['mainnet-beta'];
const DEVNET_USDC = SOLANA_USDC_MINT_BY_CLUSTER.devnet;

const validTime = {
  starts_at: '2026-06-01T12:00:00.000Z',
  ends_at: '2026-06-30T12:00:00.000Z',
};

const sampleEligibilityConfig = {
  max_events_per_user: 100,
  max_events_per_user_per_day: 20,
  required_checkpoint_ids: [],
};

const solanaAssetConfig = { mint: MAINNET_USDC, decimals: 6, symbol: 'USDC' };

function solanaCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    settlement_rail: 'solana',
    slug: 'sol-pilot',
    title: 'Solana pilot',
    sponsor_name: 'Acme',
    max_redemptions: 100,
    ...validTime,
    eligibility_config: sampleEligibilityConfig,
    campaign_wallet_address: SOLANA_CAMPAIGN,
    venue_settlement_wallet_address: SOLANA_VENUE,
    usdc_asset_config: solanaAssetConfig,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('settlementRailSchema', () => {
  it('includes solana alongside existing rails', () => {
    for (const rail of ['base', 'stellar', 'tempo', 'solana']) {
      expect(settlementRailSchema.safeParse(rail).success).toBe(true);
    }
  });
});

describe('solanaAddressSchema', () => {
  it('trims but preserves case (base58 is case-sensitive)', () => {
    expect(solanaAddressSchema.parse(`  ${SOLANA_VENUE} `)).toBe(SOLANA_VENUE);
  });

  it.each([
    ['EVM address', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
    [
      'Stellar address',
      'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
    ],
    ['non-base58 characters', '0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'],
    ['too short (31 bytes)', '1111111111111111111111111111111'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(solanaAddressSchema.safeParse(value).success).toBe(false);
  });
});

describe('solanaUsdcAssetConfigSchema', () => {
  it('accepts the configured mainnet USDC mint', () => {
    expect(
      solanaUsdcAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(true);
  });

  it('rejects a mint other than the configured one', () => {
    expect(
      solanaUsdcAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        mint: SOLANA_VENUE,
      }).success
    ).toBe(false);
  });

  it('rejects mismatched decimals or symbol', () => {
    expect(
      solanaUsdcAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        decimals: 9,
      }).success
    ).toBe(false);
    expect(
      solanaUsdcAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        symbol: 'USDT',
      }).success
    ).toBe(false);
  });

  it('follows the configured cluster mint', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CLUSTER', 'devnet');
    expect(
      solanaUsdcAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        mint: DEVNET_USDC,
      }).success
    ).toBe(true);
    expect(
      solanaUsdcAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(false);
  });
});

describe('createSponsoredActivationSchema (solana)', () => {
  it('accepts a valid Solana activation', () => {
    const r = createSponsoredActivationSchema.safeParse(solanaCreatePayload());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.settlement_rail).toBe('solana');
      expect(r.data.campaign_wallet_address).toBe(SOLANA_CAMPAIGN);
    }
  });

  it('rejects an EVM venue wallet on the Solana rail', () => {
    expect(
      createSponsoredActivationSchema.safeParse(
        solanaCreatePayload({
          venue_settlement_wallet_address:
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        })
      ).success
    ).toBe(false);
  });

  it('rejects a Base-style usdc_asset_config on the Solana rail', () => {
    expect(
      createSponsoredActivationSchema.safeParse(
        solanaCreatePayload({
          usdc_asset_config: {
            contract_address: '0x2222222222222222222222222222222222222222',
          },
        })
      ).success
    ).toBe(false);
  });

  it('rejects equal campaign and venue wallets', () => {
    expect(
      createSponsoredActivationSchema.safeParse(
        solanaCreatePayload({
          venue_settlement_wallet_address: SOLANA_CAMPAIGN,
        })
      ).success
    ).toBe(false);
  });

  it('rejects a Solana address on the Base rail', () => {
    expect(
      createSponsoredActivationSchema.safeParse({
        ...solanaCreatePayload(),
        settlement_rail: 'base',
        campaign_wallet_address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        usdc_asset_config: {
          contract_address: '0x2222222222222222222222222222222222222222',
        },
      }).success
    ).toBe(false);
  });
});

describe('adminCreateSponsoredActivationRequestSchema (solana)', () => {
  const adminPayload = {
    settlement_rail: 'solana',
    title: 'Solana activation',
    sponsor_name: 'Acme',
    max_redemptions: 100,
    ...validTime,
    venue_settlement_wallet_address: SOLANA_VENUE,
  };

  it('accepts Solana create without campaign wallet or asset config', () => {
    const r =
      adminCreateSponsoredActivationRequestSchema.safeParse(adminPayload);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.settlement_rail).toBe('solana');
      expect(r.data.eligibility_config.required_checkpoint_ids).toEqual([]);
    }
  });

  it.each(['campaign_wallet_address', 'usdc_asset_config', 'payment_token'])(
    'rejects client-supplied %s (strict)',
    (key) => {
      const value =
        key === 'usdc_asset_config'
          ? solanaAssetConfig
          : key === 'payment_token'
            ? 'USDC'
            : SOLANA_CAMPAIGN;
      expect(
        adminCreateSponsoredActivationRequestSchema.safeParse({
          ...adminPayload,
          [key]: value,
        }).success
      ).toBe(false);
    }
  );

  it('rejects a Stellar venue address', () => {
    expect(
      adminCreateSponsoredActivationRequestSchema.safeParse({
        ...adminPayload,
        venue_settlement_wallet_address:
          'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      }).success
    ).toBe(false);
  });
});

describe('updateSponsoredActivationSchema (solana)', () => {
  it('trims Solana wallet fields without changing case', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      settlement_rail: 'solana',
      venue_settlement_wallet_address: ` ${SOLANA_VENUE} `,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.venue_settlement_wallet_address).toBe(SOLANA_VENUE);
    }
  });

  it('rejects an invalid Solana venue wallet', () => {
    const r = updateSponsoredActivationSchema.safeParse({
      settlement_rail: 'solana',
      venue_settlement_wallet_address:
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual([
        'venue_settlement_wallet_address',
      ]);
    }
  });

  it('rejects a non-configured mint', () => {
    expect(
      updateSponsoredActivationSchema.safeParse({
        settlement_rail: 'solana',
        usdc_asset_config: { ...solanaAssetConfig, mint: SOLANA_VENUE },
      }).success
    ).toBe(false);
  });
});

describe('sponsoredActivationSettlementBundleSchema (solana)', () => {
  it('accepts a coherent Solana bundle', () => {
    expect(
      sponsoredActivationSettlementBundleSchema.safeParse({
        settlement_rail: 'solana',
        campaign_wallet_address: SOLANA_CAMPAIGN,
        venue_settlement_wallet_address: SOLANA_VENUE,
        usdc_asset_config: solanaAssetConfig,
      }).success
    ).toBe(true);
  });

  it('rejects switching a Solana activation to an EVM venue wallet', () => {
    expect(
      sponsoredActivationSettlementBundleSchema.safeParse({
        settlement_rail: 'solana',
        campaign_wallet_address: SOLANA_CAMPAIGN,
        venue_settlement_wallet_address:
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        usdc_asset_config: solanaAssetConfig,
      }).success
    ).toBe(false);
  });
});
