'use client';

import * as Sentry from '@sentry/nextjs';
import { normalizeError } from '@/lib/monitoring/capture-handled-exception';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      if (typeof error === 'object' && error !== null && 'digest' in error) {
        const digest = (error as { digest?: unknown }).digest;
        if (typeof digest === 'string' && digest.length > 0) {
          scope.setContext('next_global_error', { digest });
        }
      }

      // Next may surface non-Error values in edge cases; normalization avoids
      // Sentry events titled "<unknown>" with no exception message.
      Sentry.captureException(normalizeError(error));
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h2>Something went wrong.</h2>
      </body>
    </html>
  );
}
