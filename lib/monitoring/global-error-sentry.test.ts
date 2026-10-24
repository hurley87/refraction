import { describe, expect, it } from 'vitest';

import { prepareGlobalErrorForSentry } from './global-error-sentry';

describe('prepareGlobalErrorForSentry', () => {
  it('preserves a non-empty message', () => {
    const input = Object.assign(new Error('Something broke'), {
      digest: 'abc123',
    });
    const result = prepareGlobalErrorForSentry(input);
    expect(result.error.message).toBe('Something broke');
    expect(result.digest).toBe('abc123');
  });

  it('uses digest when the message is empty (opaque Sentry titles)', () => {
    const input = Object.assign(new Error(''), { digest: '571171967' });
    const result = prepareGlobalErrorForSentry(input);
    expect(result.error.message).toBe(
      'Next.js global error (digest: 571171967)'
    );
    expect(result.digest).toBe('571171967');
  });

  it('falls back when message and digest are missing', () => {
    const result = prepareGlobalErrorForSentry(new Error(''));
    expect(result.error.message).toBe('Next.js global error');
    expect(result.digest).toBeUndefined();
  });
});
