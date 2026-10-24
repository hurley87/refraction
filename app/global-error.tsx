'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { prepareGlobalErrorForSentry } from '@/lib/monitoring/global-error-sentry';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    const { error: normalized, digest } = prepareGlobalErrorForSentry(error);
    Sentry.withScope((scope) => {
      if (digest) {
        scope.setTag('next.error_digest', digest);
        scope.setFingerprint(['next-global-error', digest]);
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
