function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const VIEM_RPC_TRANSPORT_ERROR_NAMES = new Set([
  'HttpRequestError',
  'WebSocketRequestError',
  'TimeoutError',
  'SocketClosedError',
]);

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 8 || error == null) return '';

  if (error instanceof Error) {
    const causeText = error.cause
      ? collectErrorText(error.cause, depth + 1)
      : '';
    return `${error.message} ${causeText}`;
  }

  if (isPlainRecord(error)) {
    const message =
      typeof error.message === 'string' ? `${error.message} ` : '';
    const causeText = error.cause
      ? collectErrorText(error.cause, depth + 1)
      : '';
    return `${message}${causeText}`;
  }

  return String(error);
}

function hasViemRpcTransportErrorName(error: unknown, depth = 0): boolean {
  if (depth > 8 || error == null) return false;

  if (error instanceof Error) {
    if (VIEM_RPC_TRANSPORT_ERROR_NAMES.has(error.name)) {
      return true;
    }
    return hasViemRpcTransportErrorName(error.cause, depth + 1);
  }

  if (isPlainRecord(error)) {
    if (
      typeof error.name === 'string' &&
      VIEM_RPC_TRANSPORT_ERROR_NAMES.has(error.name)
    ) {
      return true;
    }
    return hasViemRpcTransportErrorName(error.cause, depth + 1);
  }

  return false;
}

function messageLooksLikeTransportNetworkFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    // Node.js / undici (server-side fetch, Supabase transport).
    normalized.includes('fetch failed') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror when attempting to fetch resource') ||
    normalized.includes('network request failed') ||
    // viem RPC HTTP/WebSocket transport (e.g. ContractFunctionExecutionError).
    normalized.includes('http request failed') ||
    normalized.includes('websocket request failed') ||
    normalized.includes('the request took too long to respond') ||
    normalized.includes('the socket has been closed')
  );
}

/**
 * True when fetch() or viem RPC transport failed (offline, DNS, TLS, reset,
 * timeout, RPC outage). These are environmental — not application logic bugs.
 */
export function isFetchNetworkError(error: unknown): boolean {
  return (
    hasViemRpcTransportErrorName(error) ||
    messageLooksLikeTransportNetworkFailure(collectErrorText(error))
  );
}
