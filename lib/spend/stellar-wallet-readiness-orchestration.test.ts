import { Asset, Operation } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import {
  buildStellarUsdcChangeTrustOperation,
  STELLAR_USDC_TRUSTLINE_MAX_LIMIT,
} from './stellar-wallet-readiness-orchestration';

const VALID_STELLAR_PUBLIC_KEY =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('Stellar wallet readiness orchestration', () => {
  it('builds the USDC trustline operation with a Stellar amount limit', () => {
    const usdcAsset = new Asset('USDC', VALID_STELLAR_PUBLIC_KEY);

    expect(() =>
      Operation.changeTrust({
        asset: usdcAsset,
        limit: '9223372036854775807',
      })
    ).toThrow(/limit argument/);
    expect(STELLAR_USDC_TRUSTLINE_MAX_LIMIT).toBe('922337203685.4775807');
    expect(() => buildStellarUsdcChangeTrustOperation(usdcAsset)).not.toThrow();
  });
});
