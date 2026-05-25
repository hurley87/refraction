import type { Horizon } from '@stellar/stellar-sdk';

export function formatUsdcAmountForStellar(amount: number): string {
  const floored = Math.floor(amount * 1e7) / 1e7;
  return floored.toFixed(7);
}

/** Classifies Horizon / transport failures during Stellar payment submission. */
export function classifyStellarHorizonSubmitError(
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

export function readHorizonHttpErrorData(e: unknown): {
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

export async function loadAccountOrThrow(
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
