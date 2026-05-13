import { describe, expect, it } from 'vitest';
import { sentryBeforeSend } from '../sentry';

describe('sentryBeforeSend', () => {
  it('drops wallet injector chrome.runtime.sendMessage webpage errors', () => {
    const msg =
      'TypeError: Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function callback): chrome.runtime.sendMessage() called from a webpage must specify an Extension ID (string) for its first argument.';

    expect(
      sentryBeforeSend({
        request: { url: 'https://example.com/events' },
        exception: { values: [{ value: msg }] },
      })
    ).toBeNull();
  });

  it('still forwards unrelated errors', () => {
    const event = {
      request: { url: 'https://example.com/events' },
      exception: { values: [{ value: 'ReferenceError: foo is not defined' }] },
    };
    expect(sentryBeforeSend(event)).toBe(event);
  });
});
