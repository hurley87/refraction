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

  it('returns null for wallet extension ethereum getter conflict noise', () => {
    const event = {
      request: { url: 'https://example.com/dashboard' },
      exception: {
        values: [
          {
            value:
              'TypeError: Cannot set property ethereum of #<Window> which has only a getter',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for wallet extension ethereum redefine conflict noise', () => {
    const event = {
      request: { url: 'https://example.com/dashboard' },
      exception: {
        values: [
          {
            value: 'TypeError: Cannot redefine property: ethereum',
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

  it('returns null for client fetch network failures (e.g. offline at venues)', () => {
    const networkError = new TypeError('Failed to fetch (h4n.app)');
    const event = {
      request: { url: 'https://h4n.app/c/summer-party' },
      exception: {
        values: [{ value: 'TypeError: Failed to fetch (h4n.app)' }],
      },
    };

    expect(
      sentryBeforeSend(event, { originalException: networkError })
    ).toBeNull();
  });

  it('returns null for Node.js undici fetch failed transport errors', () => {
    const networkError = new TypeError('fetch failed');
    const event = {
      request: { url: 'https://www.irl.energy/c/abc123' },
      exception: {
        values: [{ value: 'TypeError: fetch failed' }],
      },
    };

    expect(
      sentryBeforeSend(event, { originalException: networkError })
    ).toBeNull();
  });

  it('returns null for Safari-style load failed network errors', () => {
    const event = {
      request: { url: 'https://www.irl.energy/events' },
      exception: {
        values: [{ value: 'TypeError: Load failed' }],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('drops wallet inpage.js TypeError reading type (JAVASCRIPT-NEXTJS-13)', () => {
    const event = {
      request: { url: 'https://www.irl.energy/events' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value:
              "TypeError: Cannot read properties of undefined (reading 'type')",
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

  it('drops errors whose stack traces originate from wallet inpage.js injection', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value:
              "Cannot read properties of undefined (reading 'removeListener')",
            stacktrace: {
              frames: [
                { filename: 'app:///inpage.js', abs_path: 'app:///inpage.js' },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('keeps app TypeError reading type without extension frames', () => {
    const event = {
      request: { url: 'https://www.irl.energy/events' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value:
              "TypeError: Cannot read properties of undefined (reading 'type')",
            stacktrace: {
              frames: [
                {
                  filename: 'app:///chunks/app-events-page.js',
                  abs_path: 'app:///chunks/app-events-page.js',
                },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toEqual(event);
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
