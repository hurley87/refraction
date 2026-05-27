import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getDefaultStellarSponsoredActivationUsdcAssetConfig,
  getStellarSponsoredCampaignPublicKey,
  parseStellarSponsoredCampaignKeypair,
} from './stellar-campaign-wallet-config';

describe('stellar-campaign-wallet-config', () => {
  const kp = Keypair.random();
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('reads campaign keypair from SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY', () => {
    process.env.SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY = kp.secret();
    delete process.env.SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY;
    expect(parseStellarSponsoredCampaignKeypair().publicKey()).toBe(
      kp.publicKey()
    );
    expect(getStellarSponsoredCampaignPublicKey()).toBe(kp.publicKey());
  });

  it('falls back to treasury secret when campaign secret is unset', () => {
    delete process.env.SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY;
    process.env.SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY = kp.secret();
    expect(getStellarSponsoredCampaignPublicKey()).toBe(kp.publicKey());
  });

  it('builds default USDC asset config from spend rail env', () => {
    process.env.SPEND_RAIL_STELLAR_USDC_ASSET_CODE = 'USDC';
    process.env.SPEND_RAIL_STELLAR_USDC_USDC_ISSUER =
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    expect(getDefaultStellarSponsoredActivationUsdcAssetConfig()).toEqual({
      asset_code: 'USDC',
      issuer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    });
  });
});
