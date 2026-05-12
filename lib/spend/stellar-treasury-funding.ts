import { createHash } from 'crypto';
import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { getSpendTreasuryWalletAddress } from '@/lib/spend-rail-config';
import {
  isSpendRailError,
  spendRailErrorFundingFailed,
  spendRailErrorNetworkUnavailable,
  spendRailErrorStellarTreasuryCannotFundSpend,
  spendRailErrorTreasuryConfiguration,
  spendRailErrorWalletReadinessFailed,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import { parseStellarTreasuryFundingKeypair } from '@/lib/spend/stellar-treasury-funding-config';
import {
  getStellarSpendHorizonUrl,
  getStellarSpendNetworkPassphrase,
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
} from '@/lib/spend/stellar-wallet-readiness-config';

const HORIZON_TX_POLL_ATTEMPTS = 8;
const HORIZON_TX_POLL_INTERVAL_MS = 1500;
const PRIOR_PAYMENT_PAGE_LIMIT = 100;
const PRIOR_PAYMENT_MAX_PAGES = 5;

function classifyHorizonException(e: unknown): SpendRailError {
  const raw = e instanceof Error ? e.message : String(e);
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
    return spendRailErrorNetworkUnavailable();
  }
  return spendRailErrorNetworkUnavailable();
}

function classifySubmitException(e: unknown): SpendRailError {
  const raw = e instanceof Error ? e.message : String(e);
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
    return spendRailErrorNetworkUnavailable();
  }
  if (
    s.includes('underfunded') ||
    s.includes('op_underfunded') ||
    s.includes('op_low_reserve') ||
    s.includes('insufficient balance')
  ) {
    return spendRailErrorStellarTreasuryCannotFundSpend();
  }
  if (s.includes('op_no_trust') || s.includes('trust')) {
    return spendRailErrorWalletReadinessFailed();
  }
  return spendRailErrorFundingFailed();
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
      throw spendRailErrorTreasuryConfiguration();
    }
    throw classifyHorizonException(e);
  }
}

function hasUsdcTrustline(
  account: Horizon.AccountResponse,
  code: string,
  issuer: string
): boolean {
  for (const b of account.balances) {
    if (
      b.asset_type !== 'credit_alphanum4' &&
      b.asset_type !== 'credit_alphanum12'
    ) {
      continue;
    }
    if (b.asset_code === code && b.asset_issuer === issuer) return true;
  }
  return false;
}

function parseUsdcBalanceLine(
  account: Horizon.AccountResponse,
  code: string,
  issuer: string
): number | null {
  for (const b of account.balances) {
    if (
      b.asset_type !== 'credit_alphanum4' &&
      b.asset_type !== 'credit_alphanum12'
    ) {
      continue;
    }
    if (b.asset_code === code && b.asset_issuer === issuer) {
      const n = Number(b.balance);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

export function stellarFundingMemoHashBuffer(
  fundingReferenceId: string
): Buffer {
  return createHash('sha256').update(fundingReferenceId, 'utf8').digest();
}

function memoHashMatchesTransaction(
  tx: { memo_type?: string; memo?: string | null },
  expected: Buffer
): boolean {
  if (tx.memo_type !== 'hash') return false;
  const m = tx.memo?.trim();
  if (!m) return false;
  const want = expected.toString('hex').toLowerCase();
  return m.toLowerCase() === want;
}

function formatUsdcAmountForStellar(amount: number): string {
  const floored = Math.floor(amount * 1e7) / 1e7;
  return floored.toFixed(7);
}

function amountsRoughlyEqual(a: string, b: string): boolean {
  return Math.abs(Number(a) - Number(b)) < 1e-7;
}

async function waitForHorizonTxSuccess(
  server: Horizon.Server,
  txHash: string
): Promise<'success' | 'failed' | 'pending'> {
  const h = txHash.trim().toLowerCase();
  for (let i = 0; i < HORIZON_TX_POLL_ATTEMPTS; i += 1) {
    try {
      const tx = await server.transactions().transaction(h).call();
      if (tx.successful) return 'success';
      return 'failed';
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        await new Promise((r) => setTimeout(r, HORIZON_TX_POLL_INTERVAL_MS));
        continue;
      }
      return 'pending';
    }
  }
  return 'pending';
}

/**
 * Confirmed USDC balance on the configured Stellar treasury account (Horizon).
 */
export async function readStellarTreasuryConfirmedUsdcBalance(): Promise<number> {
  const treasuryPub = getSpendTreasuryWalletAddress('stellar_usdc').trim();
  const parsedTreasury = stellarWalletAddressSchema.safeParse(treasuryPub);
  if (!parsedTreasury.success) {
    throw spendRailErrorTreasuryConfiguration();
  }

  const usdcIssuer = getStellarSpendUsdcIssuer();
  if (!usdcIssuer) {
    throw spendRailErrorTreasuryConfiguration();
  }
  const code = getStellarSpendUsdcAssetCode();

  const horizonUrl = getStellarSpendHorizonUrl();
  const server = new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith('http://'),
  });

  const acct = await loadAccountOrThrow(server, parsedTreasury.data);
  if (!hasUsdcTrustline(acct, code, usdcIssuer)) {
    throw spendRailErrorTreasuryConfiguration();
  }
  const bal = parseUsdcBalanceLine(acct, code, usdcIssuer);
  if (bal === null) {
    throw spendRailErrorTreasuryConfiguration();
  }
  return bal;
}

export async function findSuccessfulStellarFundingTxByMemo(input: {
  treasuryPublicKey: string;
  destinationPublicKey: string;
  fundingReferenceId: string;
  usdcAmount: number;
  usdcIssuer: string;
  usdcCode: string;
}): Promise<string | null> {
  const horizonUrl = getStellarSpendHorizonUrl();
  const server = new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith('http://'),
  });

  const memoBuf = stellarFundingMemoHashBuffer(input.fundingReferenceId);
  const wantAmount = formatUsdcAmountForStellar(input.usdcAmount);

  let page;
  try {
    page = await server
      .payments()
      .forAccount(input.treasuryPublicKey)
      .order('desc')
      .limit(PRIOR_PAYMENT_PAGE_LIMIT)
      .call();
  } catch (e) {
    console.error('findSuccessfulStellarFundingTxByMemo first page:', e);
    throw classifyHorizonException(e);
  }

  for (let pageIdx = 0; pageIdx < PRIOR_PAYMENT_MAX_PAGES; pageIdx += 1) {
    const records = page.records.filter(
      (r): r is Horizon.ServerApi.PaymentOperationRecord =>
        r.type === 'payment' && 'from' in r
    );

    for (const p of records) {
      if (p.from !== input.treasuryPublicKey) continue;
      if (p.to !== input.destinationPublicKey) continue;
      if (
        p.asset_type !== 'credit_alphanum4' &&
        p.asset_type !== 'credit_alphanum12'
      ) {
        continue;
      }
      if (
        p.asset_code !== input.usdcCode ||
        p.asset_issuer !== input.usdcIssuer
      ) {
        continue;
      }
      if (!amountsRoughlyEqual(p.amount, wantAmount)) continue;
      if (!p.transaction_successful) continue;

      try {
        const tx = await server
          .transactions()
          .transaction(p.transaction_hash)
          .call();
        if (memoHashMatchesTransaction(tx, memoBuf)) {
          return p.transaction_hash;
        }
      } catch (e) {
        console.warn(
          'findSuccessfulStellarFundingTxByMemo tx fetch:',
          p.transaction_hash,
          e
        );
      }
    }

    const canPage =
      typeof page.next === 'function' &&
      page.records.length >= PRIOR_PAYMENT_PAGE_LIMIT;
    if (!canPage) break;
    try {
      page = await page.next();
    } catch (e) {
      console.error('findSuccessfulStellarFundingTxByMemo page.next:', e);
      throw classifyHorizonException(e);
    }
  }

  return null;
}

export type StellarTreasuryFundingSubmitResult =
  | { kind: 'confirmed'; txHash: string }
  | { kind: 'submitted'; txHash: string }
  | { kind: 'error'; error: SpendRailError };

/**
 * Submits a treasury → user USDC payment with a hash memo derived from `fundingReferenceId`.
 * Inline confirmation: returns `confirmed` when Horizon reports success within the poll window.
 */
export async function submitStellarTreasuryUsdcFunding(input: {
  destinationPublicKey: string;
  usdcAmount: number;
  fundingReferenceId: string;
}): Promise<StellarTreasuryFundingSubmitResult> {
  let treasuryKp: Keypair;
  try {
    treasuryKp = parseStellarTreasuryFundingKeypair();
  } catch (e) {
    console.error('submitStellarTreasuryUsdcFunding treasury key:', e);
    return { kind: 'error', error: spendRailErrorTreasuryConfiguration() };
  }

  const configuredTreasury =
    getSpendTreasuryWalletAddress('stellar_usdc').trim();
  if (treasuryKp.publicKey() !== configuredTreasury) {
    console.error(
      'submitStellarTreasuryUsdcFunding: treasury secret public key mismatch',
      { configuredTreasury }
    );
    return { kind: 'error', error: spendRailErrorTreasuryConfiguration() };
  }

  const destOk = stellarWalletAddressSchema.safeParse(
    input.destinationPublicKey.trim()
  );
  if (!destOk.success) {
    return { kind: 'error', error: spendRailErrorWalletReadinessFailed() };
  }

  const usdcIssuer = getStellarSpendUsdcIssuer();
  if (!usdcIssuer) {
    return { kind: 'error', error: spendRailErrorTreasuryConfiguration() };
  }
  const code = getStellarSpendUsdcAssetCode();
  const asset = new Asset(code, usdcIssuer);

  const horizonUrl = getStellarSpendHorizonUrl();
  const passphrase = getStellarSpendNetworkPassphrase();
  const server = new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith('http://'),
  });

  const prior = await findSuccessfulStellarFundingTxByMemo({
    treasuryPublicKey: treasuryKp.publicKey(),
    destinationPublicKey: destOk.data,
    fundingReferenceId: input.fundingReferenceId,
    usdcAmount: input.usdcAmount,
    usdcIssuer,
    usdcCode: code,
  });
  if (prior) {
    return { kind: 'confirmed', txHash: prior };
  }

  let sourceAccount: Horizon.AccountResponse;
  try {
    sourceAccount = await loadAccountOrThrow(server, treasuryKp.publicKey());
  } catch (e) {
    if (isSpendRailError(e)) {
      return { kind: 'error', error: e };
    }
    return { kind: 'error', error: classifyHorizonException(e) };
  }

  if (!hasUsdcTrustline(sourceAccount, code, usdcIssuer)) {
    return { kind: 'error', error: spendRailErrorTreasuryConfiguration() };
  }

  let baseFee: string;
  try {
    baseFee = (await server.fetchBaseFee()).toString();
  } catch (e) {
    return { kind: 'error', error: classifyHorizonException(e) };
  }

  const amountStr = formatUsdcAmountForStellar(input.usdcAmount);
  const memoBuf = stellarFundingMemoHashBuffer(input.fundingReferenceId);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: destOk.data,
        asset,
        amount: amountStr,
      })
    )
    .addMemo(Memo.hash(memoBuf))
    .setTimeout(180)
    .build();

  tx.sign(treasuryKp);

  let txHash: string;
  try {
    const res = await server.submitTransaction(tx);
    txHash = res.hash;
  } catch (e) {
    console.error('submitStellarTreasuryUsdcFunding submit:', e);
    return { kind: 'error', error: classifySubmitException(e) };
  }

  let outcome: 'success' | 'failed' | 'pending';
  try {
    outcome = await waitForHorizonTxSuccess(server, txHash);
  } catch (e) {
    console.error('submitStellarTreasuryUsdcFunding confirmation poll:', e);
    return { kind: 'submitted', txHash };
  }
  if (outcome === 'success') {
    return { kind: 'confirmed', txHash };
  }
  if (outcome === 'failed') {
    return { kind: 'error', error: spendRailErrorFundingFailed() };
  }
  return { kind: 'submitted', txHash };
}

export async function getStellarTreasuryFundingTxOutcome(
  txHash: string
): Promise<'success' | 'failed' | 'pending'> {
  const horizonUrl = getStellarSpendHorizonUrl();
  const server = new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith('http://'),
  });
  return waitForHorizonTxSuccess(server, txHash.trim());
}
