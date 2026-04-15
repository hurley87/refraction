import * as Sentry from '@sentry/nextjs';
import {
  sentryBeforeSend,
  sentryIgnoreErrors,
  sentryTracingOptions,
} from '@/lib/monitoring/sentry';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  ignoreErrors: sentryIgnoreErrors(),
  beforeSend: sentryBeforeSend,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  ...sentryTracingOptions(),
});
