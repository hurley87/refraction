import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { privyWalletRawSignTransactionHash } from '@/lib/privy-server-rest';
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
  parseStellarSpendSponsorKeypair,
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
  privyCampaignWalletId: string;
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

  const passphrase = getStellarSpendNetworkPassphrase();
  const server = createStellarSpendHorizonServer();

  let sponsor: Keypair;
  try {
    sponsor = parseStellarSpendSponsorKeypair();
  } catch {
    return { ok: false, reason: 'stellar_sponsor_misconfigured' };
  }

  const campaignPub = campaignParse.data;
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

  const inner = new TransactionBuilder(campaignAccount, {
    fee: '0',
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: campaignPub,
        source: sponsor.publicKey(),
      })
    )
    .addOperation(
      Operation.payment({
        destination: dest,
        asset: usdcAsset,
        amount: payAmount,
      })
    )
    .addOperation(
      Operation.endSponsoringFutureReserves({
        source: campaignPub,
      })
    )
    .setTimeout(180)
    .build();

  inner.sign(sponsor);

  const hash32 = inner.hash();
  let campaignSig: Buffer;
  try {
    campaignSig = await privyWalletRawSignTransactionHash({
      walletId: input.privyCampaignWalletId,
      hash32,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: classifyStellarHorizonSubmitError(msg),
      internalMessage: msg.slice(0, 500),
    };
  }

  const campaignKp = Keypair.fromPublicKey(campaignPub);
  inner.addDecoratedSignature(
    new xdr.DecoratedSignature({
      hint: campaignKp.signatureHint(),
      signature: campaignSig,
    })
  );

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

  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    (Number(baseFee) * 10).toString(),
    inner,
    passphrase
  );
  feeBump.sign(sponsor);

  try {
    const res = await server.submitTransaction(feeBump);
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
