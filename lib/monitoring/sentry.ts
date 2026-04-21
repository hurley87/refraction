import type { EventHint } from '@sentry/nextjs';

const DEFAULT_IGNORED_ERRORS = [
  'NEXT_REDIRECT',
  'NEXT_NOT_FOUND',
  'Unauthorized',
  'walletAddress is required',
  'Privy user ID is required',
  'Invalid email format',
  'Email is required',
];

const DEFAULT_IGNORED_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/IRL-SVG/irl-logo-new.svg',
  '/IRL-SVG/irl-logo-new-favicon.svg',
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
      value?: string;
    }>;
  };
  message?: string;
};

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
  const path = eventPath(event);
  if (path && DEFAULT_IGNORED_PATHS.some((segment) => path.includes(segment))) {
    return null;
  }

  const message = eventMessage(event, hint).toLowerCase();
  if (!message) return event;

  const isKnownNoise =
    message.includes('extension context invalidated') ||
    message.includes('could not establish connection') ||
    message.includes('receiving end does not exist') ||
    message.includes('runtime.lasterror');

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
