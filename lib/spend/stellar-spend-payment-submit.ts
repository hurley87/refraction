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

function classifySubmitMessage(raw: string): string {
  const s = raw.toLowerCase();
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
    return {
      ok: false,
      reason: classifySubmitMessage(msg),
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
        source: sponsor.publicKey(),
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
    const extras = (e as { response?: { data?: unknown } })?.response?.data;
    const detail =
      extras && typeof extras === 'object'
        ? JSON.stringify(extras).slice(0, 800)
        : '';
    return {
      ok: false,
      reason: classifySubmitMessage(msg),
      internalMessage: `${msg.slice(0, 400)} ${detail}`,
    };
  }
}
