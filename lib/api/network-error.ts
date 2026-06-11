function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectErrorText(error: unknown): string {
  if (error instanceof Error) {
    const causeText = error.cause ? collectErrorText(error.cause) : '';
    return `${error.message} ${causeText}`;
  }

  if (isPlainRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return String(error ?? '');
}

function messageLooksLikeFetchNetworkFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    // Node.js / undici (server-side fetch, Supabase transport).
    normalized.includes('fetch failed') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror when attempting to fetch resource') ||
    normalized.includes('network request failed')
  );
}

/**
 * True when fetch() failed at the transport layer (offline, DNS, TLS, reset,
 * timeout). These are environmental — not application logic bugs.
 */
export function isFetchNetworkError(error: unknown): boolean {
  return messageLooksLikeFetchNetworkFailure(collectErrorText(error));
}
