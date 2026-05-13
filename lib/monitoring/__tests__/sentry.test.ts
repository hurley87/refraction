import { describe, expect, it } from 'vitest';
import { sentryBeforeSend } from '@/lib/monitoring/sentry';

describe('sentryBeforeSend', () => {
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

  it('keeps normal Error events', () => {
    const event = {
      exception: {
        values: [{ value: 'TypeError: Cannot read properties of undefined' }],
      },
      request: { url: 'https://www.irl.energy/interactive-map' },
    };
    const hint = {
      originalException: new TypeError('Cannot read properties of undefined'),
    };

    expect(sentryBeforeSend(event, hint)).toEqual(event);
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
});
