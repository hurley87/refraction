import * as Sentry from '@sentry/nextjs';
import {
  sentryBeforeSend,
  sentryIgnoreErrors,
  sentryTracingOptions,
} from '@/lib/monitoring/sentry';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV,
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  beforeSend: sentryBeforeSend,
  ignoreErrors: sentryIgnoreErrors(),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  ...sentryTracingOptions(),
});
