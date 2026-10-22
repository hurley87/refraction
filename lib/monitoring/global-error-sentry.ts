import { normalizeError } from '@/lib/monitoring/capture-handled-exception';

export type NextGlobalError = Error & { digest?: string };

/**
 * Prepares a Next.js `global-error` boundary error for Sentry. Production builds
 * often redact or omit `message`, which yields opaque issue titles (e.g. minified
 * `T.captureException`) unless we attach the Next digest.
 */
export function prepareGlobalErrorForSentry(error: NextGlobalError): {
  error: Error;
  digest?: string;
} {
  const normalized = normalizeError(error);
  const digest =
    typeof error?.digest === 'string' && error.digest.length > 0
      ? error.digest
      : undefined;

  if (!normalized.message.trim()) {
    normalized.message = digest
      ? `Next.js global error (digest: ${digest})`
      : 'Next.js global error';
  }

  return { error: normalized, digest };
}
