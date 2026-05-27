import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { parseStellarSponsoredCampaignKeypair } from '@/lib/activation/stellar-campaign-wallet-config';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { stellarUsdcAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import {
  classifyStellarHorizonSubmitError,
  formatUsdcAmountForStellar,
  loadAccountOrThrow,
  readHorizonHttpErrorData,
} from '@/lib/stellar/horizon-submit-helpers';
import {
  createStellarSpendHorizonServer,
  getStellarSpendNetworkPassphrase,
} from '@/lib/spend/stellar-wallet-readiness-config';

export type StellarSettlementAssetConfig = {
  asset_code: string;
  issuer: string;
};

export function parseStellarSettlementAssetConfig(
  usdcAssetConfig: Record<string, unknown>
):
  | { ok: true; config: StellarSettlementAssetConfig }
  | { ok: false; reason: string } {
  const parsed = stellarUsdcAssetConfigSchema.safeParse(usdcAssetConfig);
  if (!parsed.success) {
    return { ok: false, reason: 'stellar_usdc_asset_misconfigured' };
  }
  return { ok: true, config: parsed.data };
}

/** USDC asset comes from activation `usdc_asset_config`, not spend-rail env. */
export async function submitStellarActivationSettlementFromCampaign(input: {
  campaignPublicKey: string;
  venueSettlementPublicKey: string;
  usdcAmount: number;
  usdcAssetConfig: Record<string, unknown>;
}): Promise<
  | { ok: true; txHash: string }
  | { ok: false; reason: string; internalMessage?: string }
> {
  const assetParsed = parseStellarSettlementAssetConfig(input.usdcAssetConfig);
  if (!assetParsed.ok) {
    return { ok: false, reason: assetParsed.reason };
  }

  const campaignParse = stellarWalletAddressSchema.safeParse(
    input.campaignPublicKey.trim().toUpperCase()
  );
  const venueParse = stellarWalletAddressSchema.safeParse(
    input.venueSettlementPublicKey.trim().toUpperCase()
  );
  if (!campaignParse.success || !venueParse.success) {
    return { ok: false, reason: 'stellar_address_invalid' };
  }

  let campaignKp;
  try {
    campaignKp = parseStellarSponsoredCampaignKeypair();
  } catch {
    return { ok: false, reason: 'stellar_campaign_wallet_not_configured' };
  }

  const campaignPub = campaignParse.data;
  if (campaignKp.publicKey() !== campaignPub) {
    return { ok: false, reason: 'stellar_campaign_wallet_mismatch' };
  }

  const passphrase = getStellarSpendNetworkPassphrase();
  const server = createStellarSpendHorizonServer();
  const dest = venueParse.data;
  const { asset_code: usdcCode, issuer: usdcIssuer } = assetParsed.config;
  const usdcAsset = new Asset(usdcCode, usdcIssuer);
  const payAmount = formatUsdcAmountForStellar(input.usdcAmount);

  let campaignAccount: Horizon.AccountResponse;
  try {
    campaignAccount = await loadAccountOrThrow(server, campaignPub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { resultCodes } = readHorizonHttpErrorData(e);
    return {
      ok: false,
      reason: classifyStellarHorizonSubmitError(msg, resultCodes),
      internalMessage: msg.slice(0, 500),
    };
  }

  let baseFee: string;
  try {
    baseFee = (await server.fetchBaseFee()).toString();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: classifyStellarHorizonSubmitError(msg),
      internalMessage: msg.slice(0, 500),
    };
  }

  const tx = new TransactionBuilder(campaignAccount, {
    fee: baseFee,
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: dest,
        asset: usdcAsset,
        amount: payAmount,
      })
    )
    .setTimeout(180)
    .build();

  tx.sign(campaignKp);

  try {
    const res = await server.submitTransaction(tx);
    return { ok: true, txHash: res.hash };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { data, resultCodes } = readHorizonHttpErrorData(e);
    return {
      ok: false,
      reason: classifyStellarHorizonSubmitError(msg, resultCodes),
      internalMessage: JSON.stringify({
        message: msg.slice(0, 400),
        ...(data?.title ? { horizon_title: data.title } : {}),
        ...(resultCodes ? { horizon_result_codes: resultCodes } : {}),
      }).slice(0, 1200),
    };
  }
}
