import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import {
  getSpendConversionErrorMessage,
  SPEND_TOAST_CONVERSION_ERROR,
} from '@/lib/spend-conversion-error-message';

describe('getSpendConversionErrorMessage', () => {
  it('surfaces expected API client errors from conversion confirm', () => {
    expect(
      getSpendConversionErrorMessage(
        new ApiError(400, 'This session has expired.')
      )
    ).toBe('This session has expired.');
  });

  it('falls back to the generic message for server errors', () => {
    expect(
      getSpendConversionErrorMessage(
        new ApiError(500, 'Internal treasury details')
      )
    ).toBe(SPEND_TOAST_CONVERSION_ERROR);
  });

  it('falls back to the generic message for non-API errors', () => {
    expect(getSpendConversionErrorMessage(new Error('Network failed'))).toBe(
      SPEND_TOAST_CONVERSION_ERROR
    );
  });

  it('falls back to the generic message when the API error body is blank', () => {
    expect(getSpendConversionErrorMessage(new ApiError(400, '   '))).toBe(
      SPEND_TOAST_CONVERSION_ERROR
    );
  });
});
