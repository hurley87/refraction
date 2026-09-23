'use client';

import { toast as sonnerToast } from 'sonner';

const noop = () => undefined;

/**
 * Sonner toast with null-safe method access. A null `toast` binding surfaces in
 * Sentry as `Cannot read properties of null (reading 'info')` on `toast.info`.
 */
export const toast: typeof sonnerToast =
  sonnerToast ??
  ({
    info: noop,
    success: noop,
    error: noop,
    warning: noop,
    message: noop,
    loading: noop,
    dismiss: noop,
    custom: noop,
    promise: noop as typeof sonnerToast.promise,
    getHistory: () => [],
    getToasts: () => [],
  } as typeof sonnerToast);
