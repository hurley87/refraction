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

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : 'Unknown error');
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

    Sentry.captureException(normalizedError);
  });
}
