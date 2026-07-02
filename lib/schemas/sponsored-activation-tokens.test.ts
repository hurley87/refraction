import { describe, expect, it } from 'vitest';
import { POSTER_CHECKOUT_USDC_ADDRESS_BASE } from '@/lib/walletconnect-poster-direct-usdc';
import {
  CADD_ADDRESS_BASE,
  describeSponsoredActivationPaymentTokenSymbol,
  getSponsoredActivationBaseTokenByContract,
  getSponsoredActivationBaseTokenBySymbol,
  isSponsoredActivationBaseTokenSymbol,
  resolveBaseTokenDecimals,
  SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS,
} from './sponsored-activation-tokens';

describe('sponsored-activation-tokens', () => {
  it('exposes USDC and CADD symbols', () => {
    expect(SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS.sort()).toEqual([
      'CADD',
      'USDC',
    ]);
  });

  it('resolves USDC (6 decimals) and CADD (18 decimals) by symbol', () => {
    expect(getSponsoredActivationBaseTokenBySymbol('USDC')).toMatchObject({
      symbol: 'USDC',
      contract_address: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
      decimals: 6,
    });
    expect(getSponsoredActivationBaseTokenBySymbol('CADD')).toMatchObject({
      symbol: 'CADD',
      contract_address: CADD_ADDRESS_BASE,
      decimals: 18,
    });
    expect(getSponsoredActivationBaseTokenBySymbol('ETH')).toBeNull();
  });

  it('resolves tokens by contract address case-insensitively', () => {
    expect(
      getSponsoredActivationBaseTokenByContract(CADD_ADDRESS_BASE.toLowerCase())
    ).toMatchObject({ symbol: 'CADD' });
    expect(
      getSponsoredActivationBaseTokenByContract(
        '0x0000000000000000000000000000000000dead'
      )
    ).toBeNull();
  });

  it('isSponsoredActivationBaseTokenSymbol narrows valid symbols', () => {
    expect(isSponsoredActivationBaseTokenSymbol('CADD')).toBe(true);
    expect(isSponsoredActivationBaseTokenSymbol('DOGE')).toBe(false);
  });

  it('resolveBaseTokenDecimals falls back to 6 for legacy/unknown contracts', () => {
    expect(resolveBaseTokenDecimals(CADD_ADDRESS_BASE)).toBe(18);
    expect(resolveBaseTokenDecimals(POSTER_CHECKOUT_USDC_ADDRESS_BASE)).toBe(6);
    expect(
      resolveBaseTokenDecimals('0x0000000000000000000000000000000000dead')
    ).toBe(6);
  });

  describe('describeSponsoredActivationPaymentTokenSymbol', () => {
    it('returns CADD for a Base activation configured with CADD', () => {
      expect(
        describeSponsoredActivationPaymentTokenSymbol({
          settlement_rail: 'base',
          usdc_asset_config: { contract_address: CADD_ADDRESS_BASE },
        })
      ).toBe('CADD');
    });

    it('reads persisted symbol before contract lookup', () => {
      expect(
        describeSponsoredActivationPaymentTokenSymbol({
          settlement_rail: 'base',
          usdc_asset_config: {
            contract_address: CADD_ADDRESS_BASE,
            symbol: 'CADD',
          },
        })
      ).toBe('CADD');
    });

    it('defaults to USDC for legacy Base rows without a recognized contract', () => {
      expect(
        describeSponsoredActivationPaymentTokenSymbol({
          settlement_rail: 'base',
          usdc_asset_config: {
            contract_address: '0x0000000000000000000000000000000000dead',
          },
        })
      ).toBe('USDC');
    });

    it('reads the Stellar asset_code', () => {
      expect(
        describeSponsoredActivationPaymentTokenSymbol({
          settlement_rail: 'stellar',
          usdc_asset_config: { asset_code: 'USDC', issuer: 'G...' },
        })
      ).toBe('USDC');
    });
  });
});
