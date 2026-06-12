/**
 * Privy REST RPC for server wallets (eth_sendTransaction + transaction polling).
 * Use this for sponsored sends where the SDK can return an empty on-chain `hash` immediately.
 * @see https://docs.privy.io/api-reference/wallets/ethereum/eth-send-transaction
 * @see https://docs.privy.io/api-reference/transactions/get
 */
import { createHash } from 'crypto';
import { SPEND_SERVER_WALLET_CAIP2 } from '@/lib/spend-server-wallet';

/** Privy REST rejects `reference_id` longer than this. */
export const PRIVY_REFERENCE_ID_MAX_LENGTH = 64;

/**
 * Ensures a Privy `reference_id` fits API limits. Values over 64 chars are mapped
 * deterministically to a 64-character SHA-256 hex digest.
 */
export function normalizePrivyReferenceId(referenceId: string): string {
  const trimmed = referenceId.trim();
  if (!trimmed) {
    throw new Error('normalizePrivyReferenceId: referenceId must be non-empty');
  }
  if (trimmed.length <= PRIVY_REFERENCE_ID_MAX_LENGTH) {
    return trimmed;
  }
  return createHash('sha256').update(trimmed).digest('hex');
}

const PRIVY_API_BASE = 'https://api.privy.io/v1';

const SUCCESS_STATUSES = new Set(['confirmed', 'finalized']);

const FAILURE_STATUSES = new Set([
  'execution_reverted',
  'failed',
  'replaced',
  'provider_error',
]);

export class PrivyRestApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`Privy REST error ${status}: ${body.slice(0, 400)}`);
    this.name = 'PrivyRestApiError';
  }
}

export class PrivyRestNotConfiguredError extends Error {
  constructor() {
    super(
      'Privy app credentials are not configured (NEXT_PUBLIC_PRIVY_APP_ID / PRIVY_APP_SECRET)'
    );
    this.name = 'PrivyRestNotConfiguredError';
  }
}

/**
 * Polling finished without a success terminal state including an on-chain hash.
 * The transaction may still complete later — reconcile via `transactionId`.
 */
export class PrivyRestTransactionTimeoutError extends Error {
  public lastStatus: string | null = null;
  constructor(public readonly transactionId: string) {
    super(
      `Privy transaction ${transactionId} did not return a final hash within the timeout`
    );
    this.name = 'PrivyRestTransactionTimeoutError';
  }
}

export class PrivyRestTransactionFailedError extends Error {
  constructor(
    public readonly transactionId: string,
    public readonly status: string,
    public readonly transactionHash: string | null
  ) {
    super(`Privy transaction ${transactionId} ended in status ${status}`);
    this.name = 'PrivyRestTransactionFailedError';
  }
}

export type SignAndSendPrivyTransactionParams = {
  walletId: string;
  /** USDC (or any contract) `to` address. */
  to: string;
  /** 0x-prefixed calldata, e.g. ERC-20 transfer. */
  data: string;
  value?: `0x${string}`;
  sponsor?: boolean;
  /** Reconciliation id (e.g. UUID), optional. */
  referenceId?: string;
};

export type PrivySendTransactionResult = {
  transactionId: string;
  userOperationHash: string | null;
  /** May be "" on sponsored sends until the transaction is indexed. */
  hash: string;
};

export type PrivyTransactionRecord = {
  id: string;
  status: string;
  transaction_hash: string | null;
  user_operation_hash?: string | null;
};

function requireRestCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new PrivyRestNotConfiguredError();
  }
  return { appId, appSecret };
}

function privyRestFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { appId, appSecret } = requireRestCredentials();
  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Basic ${auth}`);
  headers.set('privy-app-id', appId);
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${PRIVY_API_BASE}${path}`, { ...init, headers });
}

/**
 * POST /v1/wallets/{walletId}/raw_sign — sign a 32-byte hash (Tier-2 chains, e.g. Stellar).
 * @see https://docs.privy.io/wallets/using-wallets/other-chains
 */
export async function privyWalletRawSignTransactionHash(input: {
  walletId: string;
  /** 32-byte transaction signing hash (e.g. Stellar `Transaction.prototype.hash()`). */
  hash32: Buffer;
}): Promise<Buffer> {
  if (input.hash32.length !== 32) {
    throw new Error('privyWalletRawSignTransactionHash: expected 32-byte hash');
  }
  const hashHex0x = `0x${input.hash32.toString('hex')}` as const;
  const res = await privyRestFetch(
    `/wallets/${encodeURIComponent(input.walletId)}/raw_sign`,
    {
      method: 'POST',
      body: JSON.stringify({
        params: { hash: hashHex0x },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new PrivyRestApiError(res.status, text);
  }
  const json = (await res.json()) as {
    data?: { signature?: string };
  };
  const sig = json.data?.signature?.trim();
  if (!sig || !sig.startsWith('0x')) {
    throw new PrivyRestApiError(
      500,
      `Malformed Privy raw_sign response: ${JSON.stringify(json)}`
    );
  }
  const raw = Buffer.from(sig.slice(2), 'hex');
  if (raw.length !== 64) {
    throw new PrivyRestApiError(
      500,
      `Unexpected raw_sign signature length ${raw.length}`
    );
  }
  return raw;
}

/**
 * POST /v1/wallets/{walletId}/rpc — `method: eth_sendTransaction`.
 */
export async function signAndSendTransaction(
  params: SignAndSendPrivyTransactionParams
): Promise<PrivySendTransactionResult> {
  const { walletId, to, data, referenceId } = params;
  const sponsor = params.sponsor ?? true;
  const value = params.value ?? '0x0';

  const body: Record<string, unknown> = {
    method: 'eth_sendTransaction',
    caip2: SPEND_SERVER_WALLET_CAIP2,
    chain_type: 'ethereum',
    params: {
      transaction: {
        to,
        data,
        value,
      },
    },
  };
  if (sponsor) body.sponsor = true;
  if (referenceId) {
    body.reference_id = normalizePrivyReferenceId(referenceId);
  }

  const res = await privyRestFetch(
    `/wallets/${encodeURIComponent(walletId)}/rpc`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new PrivyRestApiError(res.status, text);
  }

  const json = (await res.json()) as {
    data?: {
      transaction_id?: string;
      user_operation_hash?: string;
      hash?: string;
    };
  };
  const transactionId = json.data?.transaction_id?.trim();
  if (!transactionId) {
    throw new PrivyRestApiError(
      500,
      `Malformed Privy response: ${JSON.stringify(json)}`
    );
  }

  return {
    transactionId,
    userOperationHash: json.data?.user_operation_hash?.trim() ?? null,
    hash: typeof json.data?.hash === 'string' ? json.data.hash : '',
  };
}

function readTxHash(tx: unknown): string | null {
  if (tx === null || typeof tx !== 'object') return null;
  const o = tx as Record<string, unknown>;
  for (const key of ['transaction_hash', 'transactionHash', 'hash'] as const) {
    const v = o[key];
    if (typeof v === 'string' && /^0x[a-fA-F0-9]{64}$/.test(v.trim())) {
      return v.trim();
    }
  }
  return null;
}

function readStatus(tx: unknown): string | null {
  if (tx === null || typeof tx !== 'object') return null;
  const s = (tx as Record<string, unknown>).status;
  return typeof s === 'string' ? s : null;
}

/**
 * GET /v1/transactions/{transactionId}
 */
export async function getPrivyRestTransaction(
  transactionId: string
): Promise<PrivyTransactionRecord> {
  const res = await privyRestFetch(
    `/transactions/${encodeURIComponent(transactionId)}`,
    { method: 'GET' }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new PrivyRestApiError(res.status, text);
  }
  return (await res.json()) as PrivyTransactionRecord;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type WaitForPrivyTransactionOptions = {
  timeoutMs?: number;
  initialPollMs?: number;
  maxPollMs?: number;
};

/**
 * Poll GET /v1/transactions/{id} until confirmed/finalized with a tx hash, failure, or timeout.
 * - pending, broadcasted → in progress
 * - confirmed, finalized with hash → success
 * - execution_reverted, failed, replaced, provider_error → throw
 * - success without hash yet → keep polling within timeout
 */
export async function waitForTransaction(
  transactionId: string,
  options: WaitForPrivyTransactionOptions = {}
): Promise<{
  transactionHash: `0x${string}`;
  status: string;
  userOperationHash: string | null;
}> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const initialPollMs = options.initialPollMs ?? 500;
  const maxPollMs = options.maxPollMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  let nextDelay = initialPollMs;
  let lastStatus: string | null = null;

  while (Date.now() < deadline) {
    const tx = await getPrivyRestTransaction(transactionId);
    const status = readStatus(tx) ?? tx.status;
    lastStatus = status;
    const hash = readTxHash(tx);
    const uo =
      (tx as { user_operation_hash?: string | null }).user_operation_hash ??
      null;

    if (status && FAILURE_STATUSES.has(status)) {
      throw new PrivyRestTransactionFailedError(transactionId, status, hash);
    }

    if (status && SUCCESS_STATUSES.has(status) && hash) {
      return {
        transactionHash: hash as `0x${string}`,
        status,
        userOperationHash: uo,
      };
    }

    // pending, broadcasted, or success without hash yet

    await sleep(nextDelay);
    nextDelay = Math.min(nextDelay * 2, maxPollMs);
  }

  const err = new PrivyRestTransactionTimeoutError(transactionId);
  err.lastStatus = lastStatus;
  throw err;
}
