'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { normalizeError } from '@/lib/monitoring/capture-handled-exception';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    const normalized = normalizeError(error);
    Sentry.withScope((scope) => {
      if (error?.digest) {
        scope.setTag('next.error_digest', error.digest);
      }
      Sentry.captureException(normalized);
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
