import { ApiError } from '@/lib/api/client';

export const SPEND_TOAST_CONVERSION_ERROR =
  "We couldn't complete that step. Please try again, or contact support if it keeps happening.";

export function getSpendConversionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return SPEND_TOAST_CONVERSION_ERROR;
}
