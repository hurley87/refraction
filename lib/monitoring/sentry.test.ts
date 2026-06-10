import { describe, expect, it } from 'vitest';

import {
  isAbortError,
  isIndexedDbClosingError,
  sentryBeforeSend,
} from '@/lib/monitoring/sentry';

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

describe('isIndexedDbClosingError', () => {
  it('detects InvalidStateError from closing IDB connections', () => {
    const error = new DOMException(
      "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      'InvalidStateError'
    );
    expect(isIndexedDbClosingError(error)).toBe(true);
  });

  it('detects IndexedDB server lost messages', () => {
    const error = new Error(
      'Connection to Indexed Database server lost. Refresh the page to try again'
    );
    expect(isIndexedDbClosingError(error)).toBe(true);
  });
});

describe('sentryBeforeSend', () => {
  it('returns null for IndexedDB connection-closing noise', () => {
    const idbError = new DOMException(
      "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      'InvalidStateError'
    );
    const event = {
      request: { url: 'https://example.com/dashboard' },
      exception: {
        values: [
          {
            value:
              "InvalidStateError: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
          },
        ],
      },
    };

    expect(sentryBeforeSend(event, { originalException: idbError })).toBeNull();
  });

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
