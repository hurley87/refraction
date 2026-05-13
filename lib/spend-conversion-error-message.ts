import { ApiError } from '@/lib/api/client';

export const SPEND_TOAST_CONVERSION_ERROR =
  "We couldn't complete that step. Please try again, or contact support if it keeps happening.";

export function getSpendConversionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return SPEND_TOAST_CONVERSION_ERROR;
  }
  if (error.status < 400 || error.status >= 500) {
    return SPEND_TOAST_CONVERSION_ERROR;
  }
  const message = error.message.trim();
  return message || SPEND_TOAST_CONVERSION_ERROR;
}
