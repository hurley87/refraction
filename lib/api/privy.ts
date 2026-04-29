import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import type { SpendServerWalletMetadata } from '@/lib/spend-server-wallet';

// Lazy-initialized singleton shared across all API routes
let privyClient: PrivyClient | null = null;

const PRIVY_TRANSACTION_POLL_INTERVAL_MS = 1_000;
const PRIVY_TRANSACTION_HASH_TIMEOUT_MS = 30_000;
const PRIVY_TRANSACTION_FAILED_STATUSES = new Set([
  'execution_reverted',
  'failed',
  'provider_error',
]);

function getRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function getStringField(
  value: unknown,
  keys: readonly string[]
): string | null {
  const record = getRecord(value);
  if (!record) return null;

  for (const key of keys) {
    const field = record[key];
    if (typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }

  return null;
}

function extractPrivyTransactionHash(value: unknown): string | null {
  const direct = getStringField(value, [
    'hash',
    'transactionHash',
    'transaction_hash',
  ]);
  if (direct) return direct;

  const data = getRecord(value)?.data;
  return getStringField(data, ['hash', 'transactionHash', 'transaction_hash']);
}

function extractPrivyTransactionId(value: unknown): string | null {
  const direct = getStringField(value, ['transactionId', 'transaction_id']);
  if (direct) return direct;

  const data = getRecord(value)?.data;
  const dataId = getStringField(data, ['transactionId', 'transaction_id']);
  if (dataId) return dataId;

  return getStringField(value, ['id']);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables'
      );
    }

    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

/**
 * Privy may return only a transaction id for server-wallet sends. Poll Privy's
 * transaction API so callers can persist the on-chain hash before resuming work.
 */
export async function resolvePrivyServerTransactionHash(
  response: unknown,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<string | null> {
  const directHash = extractPrivyTransactionHash(response);
  if (directHash) return directHash;

  const transactionId = extractPrivyTransactionId(response);
  if (!transactionId) return null;

  const timeoutMs = options.timeoutMs ?? PRIVY_TRANSACTION_HASH_TIMEOUT_MS;
  const pollIntervalMs =
    options.pollIntervalMs ?? PRIVY_TRANSACTION_POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  do {
    const transaction = await getPrivyClient().walletApi.getTransaction({
      id: transactionId,
    });
    const hash = extractPrivyTransactionHash(transaction);
    if (hash) return hash;

    const status = getStringField(transaction, ['status']);
    if (status && PRIVY_TRANSACTION_FAILED_STATUSES.has(status)) {
      throw new Error(`Privy transaction ${transactionId} ${status}`);
    }

    if (Date.now() >= deadline) break;
    await delay(Math.min(pollIntervalMs, Math.max(deadline - Date.now(), 0)));
  } while (Date.now() <= deadline);

  return null;
}

/**
 * Verify the Privy auth token from the Authorization header and confirm
 * the authenticated user matches the requested privyUserId.
 */
export async function verifyCallerIdentity(
  req: NextRequest,
  privyUserId: string
): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);

    if (verifiedClaims.userId !== privyUserId) {
      return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true };
  } catch {
    return { authorized: false, error: 'Invalid or expired token' };
  }
}

/**
 * Return the Privy `userId` for a valid Bearer token, or null.
 */
export async function getPrivyUserIdFromRequest(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims.userId;
  } catch {
    return null;
  }
}

/**
 * Verify the caller is authenticated with Privy and owns the provided wallet.
 */
export async function verifyWalletOwnership(
  req: NextRequest,
  walletAddress: string
): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(verifiedClaims.userId);
    const normalizedRequestedWallet = walletAddress.toLowerCase();

    const ownsWallet = user.linkedAccounts?.some((account) => {
      if (account.type !== 'wallet' || !('address' in account)) {
        return false;
      }
      return account.address.toLowerCase() === normalizedRequestedWallet;
    });

    if (!ownsWallet) {
      return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true, userId: verifiedClaims.userId };
  } catch {
    return { authorized: false, error: 'Invalid or expired token' };
  }
}

/**
 * Summarize a Privy API response for logs without dumping large or sensitive payloads.
 */
export function formatPrivyResponseForLog(
  value: unknown
): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { type: typeof value };
  }
  if (typeof value !== 'object') {
    return { type: typeof value, preview: String(value).slice(0, 200) };
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).slice(0, 20)) {
    const v = record[key];
    if (v === null || v === undefined) {
      out[key] = v;
    } else if (typeof v === 'string') {
      out[key] = v.length > 120 ? `${v.slice(0, 120)}…` : v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[key] = v;
    } else if (Array.isArray(v)) {
      out[key] = `[array length ${v.length}]`;
    } else if (typeof v === 'object') {
      out[key] = '[object]';
    } else {
      out[key] = String(v).slice(0, 80);
    }
  }
  return out;
}

export async function createSpendPrivyServerWallet(params: {
  idempotencyKey: string;
}): Promise<SpendServerWalletMetadata> {
  try {
    const wallet = await getPrivyClient().walletApi.createWallet({
      chainType: 'ethereum',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      privy_server_wallet_id: wallet.id,
      server_wallet_address: wallet.address,
      server_wallet_chain: 'base-mainnet',
      server_wallet_created_at: wallet.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('createSpendPrivyServerWallet:', error);
    throw new Error('Privy server wallet could not be created');
  }
}
