import { Asset, Operation } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { STELLAR_USDC_TRUSTLINE_MAX_LIMIT } from './stellar-wallet-readiness-orchestration';

const VALID_STELLAR_PUBLIC_KEY =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/** Int64-style string rejected by the SDK; Stellar amounts use decimal/scientific format. */
const INVALID_TRUSTLINE_LIMIT_FORMAT = '9223372036854775807';

describe('Stellar wallet readiness orchestration', () => {
  it('uses a Stellar-formatted max limit for USDC changeTrust', () => {
    const usdcAsset = new Asset('USDC', VALID_STELLAR_PUBLIC_KEY);

    expect(() =>
      Operation.changeTrust({
        asset: usdcAsset,
        limit: INVALID_TRUSTLINE_LIMIT_FORMAT,
      })
    ).toThrow();
    expect(() =>
      Operation.changeTrust({
        asset: usdcAsset,
        limit: STELLAR_USDC_TRUSTLINE_MAX_LIMIT,
      })
    ).not.toThrow();
  });
});
