const CHUNK_LOAD_PATTERNS = [
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i,
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export const CHUNK_RELOAD_SESSION_KEY = 'irl-chunk-reload-attempted';
const RELOAD_COOLDOWN_MS = 10_000;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function messageFromReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === 'string') {
    return reason;
  }

  if (isPlainRecord(reason) && typeof reason.message === 'string') {
    return reason.message;
  }

  return reason != null ? String(reason) : '';
}

/**
 * Webpack/Next.js emit this when a lazy-loaded chunk 404s (common after deploys)
 * or when a transient network failure blocks `import()`.
 */
export function isChunkLoadError(reason: unknown): boolean {
  if (reason instanceof Error && reason.name === 'ChunkLoadError') {
    return true;
  }

  const message = messageFromReason(reason);
  if (!message) return false;

  return CHUNK_LOAD_PATTERNS.some((pattern) => pattern.test(message));
}

/** Whether a one-time hard reload is allowed (guards against infinite loops). */
export function shouldAttemptChunkReload(now = Date.now()): boolean {
  if (typeof sessionStorage === 'undefined') {
    return true;
  }

  try {
    const last = sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY);
    if (!last) return true;

    const lastTime = Number.parseInt(last, 10);
    if (!Number.isFinite(lastTime)) return true;

    return now - lastTime > RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markChunkReloadAttempted(now = Date.now()): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(now));
  } catch {
    // Storage may be disabled in private browsing or full quota.
  }
}

function handleChunkLoadFailure(reason: unknown, event?: Event): void {
  if (!isChunkLoadError(reason) || !shouldAttemptChunkReload()) {
    return;
  }

  markChunkReloadAttempted();
  event?.preventDefault();
  window.location.reload();
}

/**
 * Registers global handlers that reload once when a stale/missing webpack chunk
 * is detected. Reload fetches fresh HTML with up-to-date chunk hashes.
 */
export function registerChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    handleChunkLoadFailure(event.reason, event);
  });

  window.addEventListener('error', (event) => {
    handleChunkLoadFailure(event.error ?? event.message, event);
  });
}
