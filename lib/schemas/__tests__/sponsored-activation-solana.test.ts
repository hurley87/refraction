import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminCreateSponsoredActivationRequestSchema,
  createSponsoredActivationSchema,
  settlementRailSchema,
  solanaAddressSchema,
  newSolanaCaddAssetConfigSchema,
  solanaCaddAssetConfigSchema,
  sponsoredActivationSettlementBundleSchema,
  updateSponsoredActivationSchema,
} from '../sponsored-activation';

const SOLANA_CAMPAIGN = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const SOLANA_VENUE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
/** Test-only stand-in for the deployment-supplied CADD mint. */
const TEST_CADD_MINT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
/** A later issuer-approved mint the deployment switches to. */
const ROTATED_CADD_MINT = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

const validTime = {
  starts_at: '2026-06-01T12:00:00.000Z',
  ends_at: '2026-06-30T12:00:00.000Z',
};

const sampleEligibilityConfig = {
  max_events_per_user: 100,
  max_events_per_user_per_day: 20,
  required_checkpoint_ids: [],
};

const solanaAssetConfig = { mint: TEST_CADD_MINT, decimals: 9, symbol: 'CADD' };

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

beforeEach(() => {
  vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', TEST_CADD_MINT);
});

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

describe('solanaCaddAssetConfigSchema (persisted)', () => {
  it('accepts a persisted config for the configured CADD mint', () => {
    expect(
      solanaCaddAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(true);
  });

  it('still accepts a previously persisted CADD mint after the env mint changes', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', ROTATED_CADD_MINT);
    const r = solanaCaddAssetConfigSchema.safeParse(solanaAssetConfig);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.mint).toBe(TEST_CADD_MINT);
  });

  it('does not require the env mint to be configured at all', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', '');
    expect(
      solanaCaddAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(true);
  });

  it.each([0, 6, 9, 18])(
    'accepts %i decimals (precision is not fixed to USDC)',
    (decimals) => {
      expect(
        solanaCaddAssetConfigSchema.safeParse({
          ...solanaAssetConfig,
          decimals,
        }).success
      ).toBe(true);
    }
  );

  it.each([-1, 19, 6.5, '9'])('rejects invalid decimals %s', (decimals) => {
    expect(
      solanaCaddAssetConfigSchema.safeParse({ ...solanaAssetConfig, decimals })
        .success
    ).toBe(false);
  });

  it.each([
    ['EVM address', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
    ['non-base58 characters', '0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'],
    ['too short (31 bytes)', '1111111111111111111111111111111'],
    ['empty', ''],
  ])('rejects a malformed mint (%s)', (_label, mint) => {
    expect(
      solanaCaddAssetConfigSchema.safeParse({ ...solanaAssetConfig, mint })
        .success
    ).toBe(false);
  });

  it.each(['USDC', 'cadd', ''])('rejects non-CADD symbol %j', (symbol) => {
    expect(
      solanaCaddAssetConfigSchema.safeParse({ ...solanaAssetConfig, symbol })
        .success
    ).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(
      solanaCaddAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        contract_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      }).success
    ).toBe(false);
  });
});

describe('newSolanaCaddAssetConfigSchema (new activations)', () => {
  it('accepts the currently configured CADD mint', () => {
    expect(
      newSolanaCaddAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(true);
  });

  it('rejects a mint other than the currently configured one', () => {
    const r = newSolanaCaddAssetConfigSchema.safeParse({
      ...solanaAssetConfig,
      mint: SOLANA_VENUE,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['mint']);
      expect(r.error.issues[0]?.message).toBe(
        'Solana settlement requires the configured CADD mint'
      );
    }
  });

  it('rejects the previous mint once the env mint changes', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', ROTATED_CADD_MINT);
    expect(
      newSolanaCaddAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(false);
    expect(
      newSolanaCaddAssetConfigSchema.safeParse({
        ...solanaAssetConfig,
        mint: ROTATED_CADD_MINT,
      }).success
    ).toBe(true);
  });

  it('rejects any mint when no CADD mint is configured', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', '');
    expect(
      newSolanaCaddAssetConfigSchema.safeParse(solanaAssetConfig).success
    ).toBe(false);
  });

  it('keeps the structural checks', () => {
    for (const bad of [
      { ...solanaAssetConfig, decimals: 19 },
      { ...solanaAssetConfig, symbol: 'USDC' },
      { ...solanaAssetConfig, mint: '0xabc' },
    ]) {
      expect(newSolanaCaddAssetConfigSchema.safeParse(bad).success).toBe(false);
    }
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

  it('requires the currently configured CADD mint for a new activation', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', ROTATED_CADD_MINT);
    expect(
      createSponsoredActivationSchema.safeParse(solanaCreatePayload()).success
    ).toBe(false);
    expect(
      createSponsoredActivationSchema.safeParse(
        solanaCreatePayload({
          usdc_asset_config: { ...solanaAssetConfig, mint: ROTATED_CADD_MINT },
        })
      ).success
    ).toBe(true);
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

  it('rejects re-pointing a draft at a non-configured mint', () => {
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

  it('accepts a persisted bundle whose mint predates an env mint change', () => {
    vi.stubEnv('SPONSORED_ACTIVATION_SOLANA_CADD_MINT', ROTATED_CADD_MINT);
    expect(
      sponsoredActivationSettlementBundleSchema.safeParse({
        settlement_rail: 'solana',
        campaign_wallet_address: SOLANA_CAMPAIGN,
        venue_settlement_wallet_address: SOLANA_VENUE,
        usdc_asset_config: solanaAssetConfig,
      }).success
    ).toBe(true);
  });

  it('rejects a structurally invalid persisted asset config', () => {
    for (const usdc_asset_config of [
      { ...solanaAssetConfig, mint: 'not-a-mint' },
      { ...solanaAssetConfig, decimals: -1 },
      { ...solanaAssetConfig, symbol: 'USDC' },
    ]) {
      expect(
        sponsoredActivationSettlementBundleSchema.safeParse({
          settlement_rail: 'solana',
          campaign_wallet_address: SOLANA_CAMPAIGN,
          venue_settlement_wallet_address: SOLANA_VENUE,
          usdc_asset_config,
        }).success
      ).toBe(false);
    }
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
