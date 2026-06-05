function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function messageLooksLikeFetchNetworkFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror when attempting to fetch resource') ||
    normalized.includes('network request failed')
  );
}

/**
 * True when fetch() failed at the transport layer (offline, DNS, TLS, reset,
 * timeout). These are environmental — not application logic bugs.
 */
export function isClientFetchNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return messageLooksLikeFetchNetworkFailure(error.message);
  }

  if (error instanceof Error) {
    return messageLooksLikeFetchNetworkFailure(error.message);
  }

  if (isPlainRecord(error) && typeof error.message === 'string') {
    return messageLooksLikeFetchNetworkFailure(error.message);
  }

  return false;
}
