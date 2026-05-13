import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { privyWalletRawSignTransactionHash } from '@/lib/privy-server-rest';
import {
  createStellarSpendHorizonServer,
  getStellarSpendNetworkPassphrase,
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
  parseStellarSpendSponsorKeypair,
} from '@/lib/spend/stellar-wallet-readiness-config';

function formatUsdcAmountForStellar(amount: number): string {
  const floored = Math.floor(amount * 1e7) / 1e7;
  return floored.toFixed(7);
}

function classifySubmitMessage(raw: string, resultCodes?: unknown): string {
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

function formatHorizonSubmitInternalMessage(
  msg: string,
  data: Record<string, unknown> | null,
  resultCodes: unknown
): string {
  const title = data && typeof data.title === 'string' ? data.title : null;
  const detail = data && typeof data.detail === 'string' ? data.detail : null;
  return JSON.stringify({
    message: msg.slice(0, 400),
    ...(title ? { horizon_title: title } : {}),
    ...(detail ? { horizon_detail: detail.slice(0, 800) } : {}),
    ...(resultCodes ? { horizon_result_codes: resultCodes } : {}),
  }).slice(0, 1200);
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

/**
 * One Horizon submit attempt: sponsored-fee USDC payment from the user's Stellar account
 * to the configured receiver (IRL-24). User authorization is a single Privy `raw_sign` call.
 */
export async function submitSponsoredStellarUsdcPaymentFromUser(input: {
  userPublicKey: string;
  privyStellarWalletId: string;
  destinationPublicKey: string;
  usdcAmount: number;
}): Promise<
  | { ok: true; txHash: string }
  | { ok: false; reason: string; internalMessage?: string }
> {
  const passphrase = getStellarSpendNetworkPassphrase();
  const usdcIssuer = getStellarSpendUsdcIssuer();
  if (!usdcIssuer) {
    return { ok: false, reason: 'stellar_usdc_misconfigured' };
  }
  const usdcCode = getStellarSpendUsdcAssetCode();
  const server = createStellarSpendHorizonServer();

  let sponsor: Keypair;
  try {
    sponsor = parseStellarSpendSponsorKeypair();
  } catch {
    return { ok: false, reason: 'stellar_sponsor_misconfigured' };
  }

  const userPub = input.userPublicKey.trim();
  const dest = input.destinationPublicKey.trim();
  const usdcAsset = new Asset(usdcCode, usdcIssuer);
  const payAmount = formatUsdcAmountForStellar(input.usdcAmount);

  let userAccount: Horizon.AccountResponse;
  try {
    userAccount = await loadAccountOrThrow(server, userPub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { resultCodes } = readHorizonHttpErrorData(e);
    return {
      ok: false,
      reason: classifySubmitMessage(msg, resultCodes),
      internalMessage: msg.slice(0, 500),
    };
  }

  const inner = new TransactionBuilder(userAccount, {
    fee: '0',
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: userPub,
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
        source: userPub,
      })
    )
    .setTimeout(180)
    .build();

  inner.sign(sponsor);

  const hash32 = inner.hash();
  let userSig: Buffer;
  try {
    userSig = await privyWalletRawSignTransactionHash({
      walletId: input.privyStellarWalletId,
      hash32,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: classifySubmitMessage(msg),
      internalMessage: msg.slice(0, 500),
    };
  }

  const userKp = Keypair.fromPublicKey(userPub);
  inner.addDecoratedSignature(
    new xdr.DecoratedSignature({
      hint: userKp.signatureHint(),
      signature: userSig,
    })
  );

  let baseFee: string;
  try {
    baseFee = (await server.fetchBaseFee()).toString();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: classifySubmitMessage(msg),
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
      reason: classifySubmitMessage(msg, resultCodes),
      internalMessage: formatHorizonSubmitInternalMessage(
        msg,
        data,
        resultCodes
      ),
    };
  }
}
