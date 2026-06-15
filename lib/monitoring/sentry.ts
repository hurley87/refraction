import type { EventHint } from '@sentry/nextjs';

import { isFetchNetworkError } from '@/lib/api/network-error';

const DEFAULT_IGNORED_ERRORS = [
  'NEXT_REDIRECT',
  'NEXT_NOT_FOUND',
  'Unauthorized',
  'walletAddress is required',
  'Privy user ID is required',
  'Invalid email format',
  'Email is required',
  // fetch/AbortController cancellations (navigation, unmount, timeouts).
  'AbortError',
  'The operation was aborted',
  // Competing wallet extensions injecting window.ethereum.
  'Cannot set property ethereum',
  'Cannot redefine property: ethereum',
];

const DEFAULT_IGNORED_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/irl-svg/irl-logo-new.svg',
  '/irl-svg/irl-logo-new-favicon.svg',
  '/robots.txt',
  '/sitemap.xml',
];

function safeParseUrl(url?: string): URL | null {
  if (!url) return null;

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

type SentryEventLike = {
  request?: {
    url?: string;
  };
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          filename?: string;
          abs_path?: string;
        }>;
      };
    }>;
  };
  message?: string;
  /** Populated for some browser payloads (e.g. serialized promise rejection reason). */
  extra?: Record<string, unknown>;
};

/** MetaMask and similar wallets inject `inpage.js`; their scripts can throw into window.onerror. */
function frameLooksLikeInjectedScript(
  filename?: string,
  absPath?: string
): boolean {
  const combined = `${filename ?? ''} ${absPath ?? ''}`.toLowerCase();
  return (
    combined.includes('inpage.js') ||
    combined.includes('chrome-extension://') ||
    combined.includes('moz-extension://')
  );
}

function eventFromInjectedScript(event: SentryEventLike): boolean {
  const values = event.exception?.values;
  if (!values?.length) return false;

  for (const ex of values) {
    const frames = ex.stacktrace?.frames;
    if (!frames?.length) continue;

    for (const frame of frames) {
      if (frameLooksLikeInjectedScript(frame.filename, frame.abs_path)) {
        return true;
      }
    }
  }

  return false;
}

function eventPath(event: SentryEventLike): string | null {
  const requestUrl = safeParseUrl(event.request?.url);
  if (!requestUrl) return null;
  return requestUrl.pathname || null;
}

function eventMessage(event: SentryEventLike, hint?: EventHint): string {
  const exceptionValue = event.exception?.values?.[0]?.value;
  const hintMessage =
    hint?.originalException instanceof Error
      ? hint.originalException.message
      : undefined;

  return (exceptionValue ?? event.message ?? hintMessage ?? '').toString();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * EIP-1193 providers (MetaMask, embedded wallets, etc.) reject with a plain
 * `{ code, message }` object. `4001` is "User rejected the request" / non-actionable
 * user-or-wallet state (including MetaMask edge cases like an empty wallet).
 * Those surface in Sentry as unhandled rejections titled `<unknown>`.
 */
function isEip1193UserRejectedReason(reason: unknown): boolean {
  if (!isPlainRecord(reason)) return false;
  const { code, message } = reason;
  return code === 4001 && typeof message === 'string' && message.length > 0;
}

function serializedRejectionFromEvent(
  event: SentryEventLike
): Record<string, unknown> | null {
  const serialized = event.extra?.__serialized__;
  return isPlainRecord(serialized) ? serialized : null;
}

function shouldDropEip1193UserRejection(
  event: SentryEventLike,
  hint?: EventHint
): boolean {
  if (isEip1193UserRejectedReason(hint?.originalException)) {
    return true;
  }
  const fromExtra = serializedRejectionFromEvent(event);
  return isEip1193UserRejectedReason(fromExtra);
}

/**
 * fetch() and streams reject with AbortError when a signal is aborted (component
 * unmount, route change, debounced reload). These are expected and not bugs.
 */
export function isAbortError(reason: unknown): boolean {
  if (reason instanceof Error) {
    if (reason.name === 'AbortError') return true;
    const message = reason.message.toLowerCase();
    if (message.includes('the operation was aborted')) return true;
    if (message.includes('aborterror') && message.includes('aborted')) {
      return true;
    }
  }

  if (isPlainRecord(reason) && reason.name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Competing wallet extensions (MetaMask, Rabby, Coinbase, etc.) inject
 * `window.ethereum`. When one defines a getter-only property, another's
 * injection throws — this is extension noise, not app code.
 */
function isWalletExtensionEthereumConflict(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('cannot redefine property: ethereum') ||
    lower.includes('cannot set property ethereum') ||
    (lower.includes('ethereum') && lower.includes('only a getter'))
  );
}

/**
 * WalletConnect/Reown SDKs identify sessions by `topic`. Relay messages for a
 * session that was already deleted (disconnect, navigation, background tab) can
 * throw while reading `.topic` on undefined — environmental noise, not app code.
 */
export function isWalletConnectSessionNoise(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("reading 'topic'") ||
    lower.includes('reading "topic"') ||
    lower.includes('no matching key')
  );
}

/**
 * Talisman (and similar wallets) throw when the extension is installed but the
 * user has not finished onboarding. Privy/wagmi probing injected providers can
 * surface these as unhandled rejections — not actionable app bugs.
 */
export function isWalletExtensionOnboardingNoise(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('talisman extension has not been configured');
}

function shouldDropAbortError(
  event: SentryEventLike,
  hint?: EventHint
): boolean {
  if (isAbortError(hint?.originalException)) {
    return true;
  }

  const message = eventMessage(event, hint).toLowerCase();
  return (
    message.includes('the operation was aborted') ||
    (message.includes('aborterror') && message.includes('aborted'))
  );
}

function shouldDropFetchNetworkError(
  event: SentryEventLike,
  hint?: EventHint
): boolean {
  if (isFetchNetworkError(hint?.originalException)) {
    return true;
  }

  const message = eventMessage(event, hint).toLowerCase();
  return (
    message.includes('typeerror: failed to fetch') ||
    message.includes('typeerror: fetch failed') ||
    message.includes('typeerror: load failed') ||
    message.includes('networkerror when attempting to fetch resource')
  );
}

function normalizeCsv(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean);
}

function toBoundedRate(value: string | undefined, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return numeric;
}

export function sentryIgnoreErrors(): string[] {
  const customIgnored = normalizeCsv(process.env.SENTRY_IGNORE_ERRORS ?? '');
  return [...DEFAULT_IGNORED_ERRORS, ...customIgnored];
}

export function sentryBeforeSend<T extends SentryEventLike>(
  event: T,
  hint?: EventHint
): T | null {
  if (shouldDropEip1193UserRejection(event, hint)) {
    return null;
  }

  if (shouldDropAbortError(event, hint)) {
    return null;
  }

  if (shouldDropFetchNetworkError(event, hint)) {
    return null;
  }

  const path = eventPath(event);
  if (path && DEFAULT_IGNORED_PATHS.some((segment) => path.includes(segment))) {
    return null;
  }

  if (eventFromInjectedScript(event)) {
    return null;
  }

  const message = eventMessage(event, hint).toLowerCase();
  if (!message) return event;

  const isKnownNoise =
    message.includes('extension context invalidated') ||
    message.includes('could not establish connection') ||
    message.includes('receiving end does not exist') ||
    message.includes('runtime.lasterror') ||
    isWalletExtensionEthereumConflict(message) ||
    isWalletExtensionOnboardingNoise(message) ||
    isWalletConnectSessionNoise(message) ||
    // Wallet extension inpage scripts (e.g. MetaMask), not app code.
    message.includes('called from a webpage must specify an extension id') ||
    // Extension messaging when the target tab is gone (e.g. fast navigation).
    message.includes('invalid call to runtime.sendmessage');

  if (isKnownNoise) {
    return null;
  }

  return event;
}

export function sentryTracingOptions():
  | { tracesSampleRate: number }
  | { tracesSampler: (samplingContext: any) => number | boolean } {
  const tracingEnabled = process.env.SENTRY_ENABLE_TRACING === 'true';

  if (!tracingEnabled) {
    return { tracesSampleRate: 0 };
  }

  const defaultRate = toBoundedRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1);
  const selectedRate = toBoundedRate(
    process.env.SENTRY_SELECTED_ROUTE_SAMPLE_RATE,
    0.2
  );
  const selectedRoutes = normalizeCsv(process.env.SENTRY_TRACE_ROUTES ?? '');

  return {
    tracesSampler: (samplingContext: any) => {
      const transactionName =
        samplingContext?.transactionContext?.name?.toString() ?? '';

      if (
        selectedRoutes.length > 0 &&
        selectedRoutes.some((route) => transactionName.includes(route))
      ) {
        return selectedRate;
      }

      return defaultRate;
    },
  };
}
