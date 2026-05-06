import * as Sentry from '@sentry/nextjs';

type CaptureHandledExceptionOptions = {
  route: string;
  operation: string;
  statusCode?: number;
  extra?: Record<string, unknown>;
};

function hasSentryDsn(): boolean {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

function trySerializeUnknown(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized !== '{}' && serialized !== 'null') {
      return `Unknown error: ${serialized.slice(0, 500)}`;
    }
  } catch {
    // ignore serialization failures
  }
  return 'Unknown error';
}

/**
 * Converts any thrown value into a standard Error, preserving as much
 * diagnostic information as possible.
 *
 * Handles:
 * - Standard Error instances (returned as-is)
 * - String errors
 * - Error-like objects with a `message` property (e.g. Privy SDK errors,
 *   cross-realm errors where instanceof Error fails)
 * - Arbitrary objects (JSON-serialized into the message)
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;

    let message: string;
    if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
      message = errorObj.message.trim();
    } else if (typeof errorObj.error === 'string' && errorObj.error.trim()) {
      message = errorObj.error.trim();
    } else {
      message = trySerializeUnknown(error);
    }

    const normalized = new Error(message);
    if (typeof errorObj.stack === 'string') {
      normalized.stack = errorObj.stack;
    }
    return normalized;
  }

  return new Error(String(error));
}

export function captureHandledException(
  error: unknown,
  options: CaptureHandledExceptionOptions
) {
  if (!hasSentryDsn()) {
    return;
  }

  const normalizedError = normalizeError(error);

  Sentry.withScope((scope) => {
    scope.setTag('handled', 'true');
    scope.setTag('api.route', options.route);
    scope.setTag('api.operation', options.operation);

    if (options.statusCode) {
      scope.setTag('http.status_code', options.statusCode.toString());
    }

    if (options.extra) {
      scope.setContext('handled_exception', options.extra);
    }

    // When the thrown value is not a standard Error, attach the raw details
    // so engineers can inspect the actual error structure in Sentry.
    if (!(error instanceof Error) && error !== null && error !== undefined) {
      scope.setContext('original_error', {
        type: typeof error,
        value:
          typeof error === 'object'
            ? (() => {
                try {
                  return JSON.parse(JSON.stringify(error));
                } catch {
                  return String(error);
                }
              })()
            : String(error),
      });
    }

    Sentry.captureException(normalizedError);
  });
}
