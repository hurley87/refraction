import * as Sentry from '@sentry/nextjs';
import {
  sentryBeforeSend,
  sentryIgnoreErrors,
  sentryTracingOptions,
} from '@/lib/monitoring/sentry';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  sendDefaultPii: false,
  ignoreErrors: sentryIgnoreErrors(),
  beforeSend: sentryBeforeSend,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  ...sentryTracingOptions(),
});
