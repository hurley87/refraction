import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { privyWalletRawSignTransactionHash } from '@/lib/privy-server-rest';
import { stellarUsdcAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import {
  createStellarSpendHorizonServer,
  getStellarSpendNetworkPassphrase,
  parseStellarSpendSponsorKeypair,
} from '@/lib/spend/stellar-wallet-readiness-config';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';

function formatUsdcAmountForStellar(amount: number): string {
  const floored = Math.floor(amount * 1e7) / 1e7;
  return floored.toFixed(7);
}

export function classifyStellarSettlementSubmitError(
  raw: string,
  resultCodes?: unknown
): string {
  const s = `${raw} ${JSON.stringify(resultCodes ?? {})}`.toLowerCase();
  if (
    s.includes('fetch') ||
    s.includes('econn') ||
    s.includes('timeout') ||
    s.includes('socket') ||
    s.includes('502') ||
    s.includes('503') ||
    s.includes('504')
  ) {
    return 'network_submit_failed';
  }
  if (
    s.includes('underfunded') ||
    s.includes('op_underfunded') ||
    s.includes('op_low_reserve') ||
    s.includes('insufficient balance')
  ) {
    return 'insufficient_usdc_or_reserve';
  }
  return 'stellar_submit_failed';
}

function readHorizonHttpErrorData(e: unknown): {
  data: Record<string, unknown> | null;
  resultCodes: unknown;
} {
  const raw = (e as { response?: { data?: unknown } })?.response?.data;
  if (!raw || typeof raw !== 'object') {
    return { data: null, resultCodes: null };
  }
  const data = raw as Record<string, unknown>;
  const extras = data.extras;
  if (!extras || typeof extras !== 'object') {
    return { data, resultCodes: null };
  }
  return {
    data,
    resultCodes: (extras as { result_codes?: unknown }).result_codes ?? null,
  };
}

async function loadAccountOrThrow(
  server: Horizon.Server,
  publicKey: string
): Promise<Horizon.AccountResponse> {
  try {
    return await server.loadAccount(publicKey);
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      throw new Error('source_account_missing');
    }
    throw e;
  }
}

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

/**
 * Campaign → venue USDC payment: Privy signs campaign wallet; sponsor fee-bump (IRL-58).
 * Asset from activation `usdc_asset_config`, not spend-rail env.
 */
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
      reason: classifyStellarSettlementSubmitError(msg, resultCodes),
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
      reason: classifyStellarSettlementSubmitError(msg),
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
      reason: classifyStellarSettlementSubmitError(msg),
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
      reason: classifyStellarSettlementSubmitError(msg, resultCodes),
      internalMessage: JSON.stringify({
        message: msg.slice(0, 400),
        ...(data?.title ? { horizon_title: data.title } : {}),
        ...(resultCodes ? { horizon_result_codes: resultCodes } : {}),
      }).slice(0, 1200),
    };
  }
}
