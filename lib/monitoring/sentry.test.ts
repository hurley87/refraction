import { describe, expect, it } from 'vitest';

import { isAbortError, sentryBeforeSend } from '@/lib/monitoring/sentry';

describe('isAbortError', () => {
  it('detects AbortError instances', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('detects plain objects with AbortError name', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
  });
});

describe('sentryBeforeSend', () => {
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

  it('drops errors whose stack traces originate from wallet inpage.js injection', () => {
    const event = {
      request: { url: 'https://irl.example.com/interactive-map' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value:
              "Cannot read properties of undefined (reading 'removeListener')",
            stacktrace: {
              frames: [
                { filename: 'app:///inpage.js', abs_path: 'app:///inpage.js' },
                { filename: 'app:///inpage.js' },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('drops RangeError stack overflows when stacks implicate extension scripts', () => {
    const event = {
      request: { url: 'https://www.irl.energy/' },
      exception: {
        values: [
          {
            type: 'RangeError',
            value: 'Maximum call stack size exceeded.',
            stacktrace: {
              frames: [
                {
                  filename:
                    'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js',
                  abs_path:
                    'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js',
                },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('drops fetch AbortError cancellations', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [{ value: 'AbortError: The operation was aborted.' }],
      },
    };
    const hint = {
      originalException: new DOMException(
        'The operation was aborted.',
        'AbortError'
      ),
    };

    expect(sentryBeforeSend(event, hint)).toBeNull();
  });

  it('drops EIP-1193 4001 user rejections from serialized promise reasons', () => {
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

  it('keeps app RangeError stack overflows without extension frames', () => {
    const event = {
      request: { url: 'https://www.irl.energy/dashboard' },
      exception: {
        values: [
          {
            type: 'RangeError',
            value: 'Maximum call stack size exceeded.',
            stacktrace: {
              frames: [
                {
                  filename: 'app:///chunks/app-page.js',
                  abs_path: 'app:///chunks/app-page.js',
                },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toEqual(event);
  });

  it('keeps unrelated errors', () => {
    const event = {
      request: { url: 'https://example.com/events' },
      exception: {
        values: [{ value: 'TypeError: Cannot read properties of undefined' }],
      },
    };

    expect(sentryBeforeSend(event)).toEqual(event);
  });
});
