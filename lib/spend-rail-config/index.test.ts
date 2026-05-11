import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertSpendRailAllowsNewSessions,
  formatExplorerTxUrlForSpendLedger,
  getSpendRailOperationalDiagnostics,
  getSpendRailPublicMetadata,
  getSpendReceivingWalletAddress,
  getSpendTreasuryWalletAddress,
  spendLedgerNetworkLabel,
} from '@/lib/spend-rail-config/index';

const VALID_STELLAR =
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('spendLedgerNetworkLabel', () => {
  it('maps rails to snapshot labels', () => {
    expect(spendLedgerNetworkLabel('base_usdc')).toBe('Base');
    expect(spendLedgerNetworkLabel('stellar_usdc')).toBe('Stellar');
  });
});

describe('getSpendRailPublicMetadata', () => {
  it('includes enabled flag and safe fields', () => {
    const meta = getSpendRailPublicMetadata('base_usdc');
    expect(meta.rail).toBe('base_usdc');
    expect(meta.displayName).toBe('Base USDC');
    expect(meta.assetSymbol).toBe('USDC');
    expect(typeof meta.enabled).toBe('boolean');
    expect(meta.explorerTxUrlTemplate).toContain('{txHash}');
  });
});

describe('formatExplorerTxUrlForSpendLedger', () => {
  it('returns null for pending placeholders', () => {
    expect(
      formatExplorerTxUrlForSpendLedger('base_usdc', 'pending:privy-tx-123')
    ).toBeNull();
  });

  it('applies Base template for EVM hashes (any rail)', () => {
    const h =
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(formatExplorerTxUrlForSpendLedger('base_usdc', h)).toBe(
      'https://basescan.org/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    expect(formatExplorerTxUrlForSpendLedger('stellar_usdc', h)).toContain(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  });

  it('uses stellar template for non-EVM hash on stellar rail', () => {
    const h =
      'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const url = formatExplorerTxUrlForSpendLedger('stellar_usdc', h);
    expect(url).toMatch(
      /^https:\/\/stellar\.expert\/explorer\/(public|testnet)\/tx\//
    );
  });
});

describe('getSpendRailOperationalDiagnostics — base_usdc', () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of [
      'SPEND_RAIL_BASE_USDC_ENABLED',
      'SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS',
      'SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS',
      'SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID',
      'NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE',
    ]) {
      prev[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('marks rail unavailable when kill switch is off', () => {
    process.env.SPEND_RAIL_BASE_USDC_ENABLED = 'false';
    process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID = 'w1';
    const d = getSpendRailOperationalDiagnostics('base_usdc');
    expect(d.operational).toBe(false);
    expect(d.unavailableReasons.some((r) => r.includes('disabled'))).toBe(true);
    expect(assertSpendRailAllowsNewSessions('base_usdc').ok).toBe(false);
  });

  it('marks rail unavailable when treasury address invalid', () => {
    process.env.SPEND_RAIL_BASE_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS = 'not-an-addr';
    process.env.SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID = 'w1';
    const d = getSpendRailOperationalDiagnostics('base_usdc');
    expect(d.operational).toBe(false);
    expect(
      d.unavailableReasons.some((r) => r.includes('TREASURY_WALLET'))
    ).toBe(true);
  });

  it('rejects explorer template without placeholder', () => {
    process.env.SPEND_RAIL_BASE_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID = 'w1';
    process.env.NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE =
      'https://basescan.org/tx/';
    const d = getSpendRailOperationalDiagnostics('base_usdc');
    expect(d.operational).toBe(false);
    expect(d.unavailableReasons.some((r) => r.includes('{txHash}'))).toBe(true);
  });
});

describe('getSpendRailOperationalDiagnostics — stellar_usdc', () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of [
      'SPEND_RAIL_STELLAR_USDC_ENABLED',
      'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS',
      'NEXT_PUBLIC_STELLAR_NETWORK',
      'NEXT_PUBLIC_SPEND_RAIL_STELLAR_USDC_EXPLORER_TX_URL_TEMPLATE',
    ]) {
      prev[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('happy path when enabled with valid receiving and network', () => {
    process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS = VALID_STELLAR;
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC';
    delete process.env
      .NEXT_PUBLIC_SPEND_RAIL_STELLAR_USDC_EXPLORER_TX_URL_TEMPLATE;
    const d = getSpendRailOperationalDiagnostics('stellar_usdc');
    expect(d.operational).toBe(true);
    expect(getSpendReceivingWalletAddress('stellar_usdc')).toBe(VALID_STELLAR);
  });

  it('unavailable when receiving invalid', () => {
    process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS = 'bad';
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC';
    const d = getSpendRailOperationalDiagnostics('stellar_usdc');
    expect(d.operational).toBe(false);
  });

  it('unavailable when network env missing', () => {
    process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'true';
    process.env.SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS = VALID_STELLAR;
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = '';
    const d = getSpendRailOperationalDiagnostics('stellar_usdc');
    expect(d.operational).toBe(false);
  });
});

describe('getSpendTreasuryWalletAddress', () => {
  it('resolves base treasury from env', () => {
    expect(getSpendTreasuryWalletAddress('base_usdc').toLowerCase()).toBe(
      '0x4444444444444444444444444444444444444444'
    );
  });
});
