import { describe, expect, it } from 'vitest';

import { sentryBeforeSend } from '@/lib/monitoring/sentry';

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
