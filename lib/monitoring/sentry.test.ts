import { describe, expect, it } from 'vitest';

import { isAbortError, sentryBeforeSend } from '@/lib/monitoring/sentry';

describe('isAbortError', () => {
  it('detects DOMException-style AbortError', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    expect(isAbortError(error)).toBe(true);
  });

  it('detects wrapped Error messages from Sentry serialization', () => {
    const error = new Error('AbortError: The operation was aborted.');
    expect(isAbortError(error)).toBe(true);
  });
});

describe('sentryBeforeSend', () => {
  it('returns null for fetch AbortError noise', () => {
    const abortError = new DOMException(
      'The operation was aborted.',
      'AbortError'
    );
    const event = {
      request: { url: 'https://example.com/events' },
      exception: {
        values: [{ value: 'Error: AbortError: The operation was aborted.' }],
      },
    };

    expect(
      sentryBeforeSend(event, { originalException: abortError })
    ).toBeNull();
  });

  it('returns null for wallet extension chrome.runtime.sendMessage webpage noise', () => {
    const event = {
      request: { url: 'https://example.com/events' },
      exception: {
        values: [
          {
            value:
              'TypeError: Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function callback): chrome.runtime.sendMessage() called from a webpage must specify an Extension ID (string) for its first argument.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for extension runtime.sendMessage tab-not-found noise', () => {
    const event = {
      request: { url: 'https://example.com/dashboard' },
      exception: {
        values: [
          {
            value:
              'Error: Invalid call to runtime.sendMessage(). Tab not found.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('drops EIP-1193 4001 rejections from originalException (plain object)', () => {
    const event = {
      exception: {
        values: [
          {
            value:
              'UnhandledRejection: Object captured as promise rejection with keys: code, message',
          },
        ],
      },
      request: { url: 'https://www.irl.energy/interactive-map' },
    };

    const hint = {
      originalException: {
        code: 4001,
        message: 'wallet must has at least one account',
      },
    };

    expect(sentryBeforeSend(event, hint)).toBeNull();
  });

  it('drops EIP-1193 4001 when serialized reason is only in extra.__serialized__', () => {
    const event = {
      exception: {
        values: [
          {
            value:
              'UnhandledRejection: Object captured as promise rejection with keys: code, message',
          },
        ],
      },
      extra: {
        __serialized__: {
          code: 4001,
          message: 'wallet must has at least one account',
        },
      },
      request: { url: 'https://www.irl.energy/' },
    };

    expect(sentryBeforeSend(event, {})).toBeNull();
  });

  it('keeps non-4001 provider-shaped objects', () => {
    const event = {
      exception: {
        values: [
          {
            value:
              'UnhandledRejection: Object captured as promise rejection with keys: code, message',
          },
        ],
      },
      request: { url: 'https://www.irl.energy/interactive-map' },
    };
    const hint = {
      originalException: { code: -32603, message: 'Internal JSON-RPC error.' },
    };

    expect(sentryBeforeSend(event, hint)).toEqual(event);
  });

  it('still forwards unrelated errors', () => {
    const event = {
      request: { url: 'https://example.com/events' },
      exception: {
        values: [{ value: 'TypeError: Cannot read properties of undefined' }],
      },
    };

    expect(sentryBeforeSend(event)).toEqual(event);
  });
});
