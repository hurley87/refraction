import { describe, expect, it } from 'vitest';

import {
  isAbortError,
  isAndroidJavascriptBridgeNoise,
  isExtensionStackOverflowNoise,
  isIndexedDbNoiseError,
  isPrivyWalletProviderOnNoise,
  isWalletConnectSessionNoise,
  isWalletExtensionOnboardingNoise,
  isWebkitMessageHandlersNoise,
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

describe('isWalletConnectSessionNoise', () => {
  it('detects undefined topic reads and no matching key errors', () => {
    expect(
      isWalletConnectSessionNoise(
        "TypeError: Cannot read properties of undefined (reading 'topic')"
      )
    ).toBe(true);
    expect(
      isWalletConnectSessionNoise('Error: No matching key. pairing: undefined')
    ).toBe(true);
    expect(isWalletConnectSessionNoise('TypeError: fetch failed')).toBe(false);
  });
});

describe('isWalletExtensionOnboardingNoise', () => {
  it('detects Talisman extension not configured errors', () => {
    expect(
      isWalletExtensionOnboardingNoise(
        'Error: Talisman extension has not been configured yet. Please continue with onboarding.'
      )
    ).toBe(true);
    expect(isWalletExtensionOnboardingNoise('User rejected the request')).toBe(
      false
    );
  });
});

describe('isWebkitMessageHandlersNoise', () => {
  it('detects iOS in-app browser webkit.messageHandlers probe failures', () => {
    expect(
      isWebkitMessageHandlersNoise(
        "TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers')"
      )
    ).toBe(true);
    expect(
      isWebkitMessageHandlersNoise(
        "TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers.selectedTextHandler.postMessage')"
      )
    ).toBe(true);
    expect(isWebkitMessageHandlersNoise('TypeError: fetch failed')).toBe(false);
  });
});

describe('isAndroidJavascriptBridgeNoise', () => {
  it('detects Android in-app browser JNI bridge teardown failures', () => {
    expect(
      isAndroidJavascriptBridgeNoise(
        'Error: Error invoking postMessage: Java object is gone'
      )
    ).toBe(true);
    expect(
      isAndroidJavascriptBridgeNoise(
        'Error: Error invoking enableDidUserTypeOnKeyboardLogging: Java object is gone'
      )
    ).toBe(true);
    expect(
      isAndroidJavascriptBridgeNoise(
        'Error: Error invoking enableButtonsClickedMetaDataLogging: Java object is gone'
      )
    ).toBe(true);
    expect(isAndroidJavascriptBridgeNoise('TypeError: fetch failed')).toBe(
      false
    );
  });
});

describe('isPrivyWalletProviderOnNoise', () => {
  it('detects Privy proxy provider .on failures on partial EIP-1193 providers', () => {
    expect(
      isPrivyWalletProviderOnNoise(
        'TypeError: this.walletProvider?.on is not a function'
      )
    ).toBe(true);
    expect(
      isPrivyWalletProviderOnNoise(
        'TypeError: walletProvider.on is not a function'
      )
    ).toBe(true);
    expect(isPrivyWalletProviderOnNoise('TypeError: fetch failed')).toBe(false);
  });
});

describe('isIndexedDbNoiseError', () => {
  it('detects InvalidStateError from closing IDB connections', () => {
    const error = new DOMException(
      "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      'InvalidStateError'
    );
    expect(isIndexedDbNoiseError(error)).toBe(true);
  });

  it('detects IndexedDB server lost messages', () => {
    const error = new Error(
      'Connection to Indexed Database server lost. Refresh the page to try again'
    );
    expect(isIndexedDbNoiseError(error)).toBe(true);
  });

  it('detects WebKit database-deleted-by-user messages', () => {
    const error = new DOMException(
      'Database deleted by request of the user',
      'UnknownError'
    );
    expect(isIndexedDbNoiseError(error)).toBe(true);
  });

  it('detects generic UnknownError Internal error from IndexedDB (JAVASCRIPT-NEXTJS-1F)', () => {
    const error = new DOMException('Internal error.', 'UnknownError');
    expect(isIndexedDbNoiseError(error)).toBe(true);
  });

  it('detects Chromium backing store corruption messages', () => {
    const error = new DOMException(
      'Internal error opening backing store for indexedDB.open.',
      'UnknownError'
    );
    expect(isIndexedDbNoiseError(error)).toBe(true);
  });

  it('detects Firefox unable-to-open-database-file-on-disk messages (JAVASCRIPT-NEXTJS-1J)', () => {
    const error = new DOMException(
      'Unable to open database file on disk',
      'UnknownError'
    );
    expect(isIndexedDbNoiseError(error)).toBe(true);
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

  it('returns null for IndexedDB database-deleted-by-user noise', () => {
    const idbError = new DOMException(
      'Database deleted by request of the user',
      'UnknownError'
    );
    const event = {
      request: { url: 'https://example.com/dashboard' },
      exception: {
        values: [
          {
            value:
              'Error: UnknownError: Database deleted by request of the user',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event, { originalException: idbError })).toBeNull();
  });

  it('returns null for UnknownError Internal error IndexedDB noise (JAVASCRIPT-NEXTJS-1F)', () => {
    const idbError = new DOMException('Internal error.', 'UnknownError');
    const event = {
      request: { url: 'https://www.irl.energy/dashboard' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error: UnknownError: Internal error.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event, { originalException: idbError })).toBeNull();
  });

  it('returns null for UnknownError unable-to-open-database-file IndexedDB noise (JAVASCRIPT-NEXTJS-1J)', () => {
    const idbError = new DOMException(
      'Unable to open database file on disk',
      'UnknownError'
    );
    const event = {
      request: { url: 'https://www.irl.energy/dashboard' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error: UnknownError: Unable to open database file on disk',
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

  it('returns null for extension async onMessage channel-closed noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [
          {
            value:
              'Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
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

  it('returns null for viem ContractFunctionExecutionError RPC transport failures', () => {
    const event = {
      request: { url: 'https://www.irl.energy/onboarding' },
      exception: {
        values: [
          {
            type: 'ContractFunctionExecutionError',
            value: 'ContractFunctionExecutionError: HTTP request failed.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('keeps viem ContractFunctionExecutionError contract reverts', () => {
    const event = {
      request: { url: 'https://www.irl.energy/onboarding' },
      exception: {
        values: [
          {
            type: 'ContractFunctionExecutionError',
            value:
              'ContractFunctionExecutionError: The contract function "createUser" reverted.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toEqual(event);
  });

  it('returns null for WalletConnect stale session topic noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/stellar' },
      exception: {
        values: [
          {
            value:
              "TypeError: Cannot read properties of undefined (reading 'topic')",
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for WalletConnect no matching key session noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/walletconnect' },
      exception: {
        values: [
          {
            value:
              "Error: No matching key. session topic doesn't exist: abc123",
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for Talisman extension onboarding noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [
          {
            value:
              'Error: Talisman extension has not been configured yet. Please continue with onboarding.',
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for webkit.messageHandlers in-app browser noise (JAVASCRIPT-NEXTJS-1G)', () => {
    const event = {
      request: { url: 'https://www.irl.energy/events' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value:
              "TypeError: undefined is not an object (evaluating 'window.webkit.messageHandlers')",
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for Android JNI bridge in-app browser noise (JAVASCRIPT-NEXTJS-1H)', () => {
    const event = {
      request: { url: 'https://www.irl.energy/events' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error: Error invoking postMessage: Java object is gone',
            stacktrace: {
              frames: [
                {
                  filename: 'app://navigation_performance_logger_android',
                  function: 'sendBeforeUnloadMessage',
                },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('returns null for Privy walletProvider.on partial-provider noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/dashboard' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'TypeError: this.walletProvider?.on is not a function',
            stacktrace: {
              frames: [
                {
                  filename:
                    'app:///chunks/node_modules_@privy-io_react-auth_dist_esm_privy-provider-BG8GtKO6_mjs.js',
                },
              ],
            },
          },
        ],
      },
    };

    expect(sentryBeforeSend(event)).toBeNull();
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

  it('returns null for wallet inpage.js reading type injection noise', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "Cannot read properties of undefined (reading 'type')",
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

  it('returns null for wallet inpage.js removeListener injection noise', () => {
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

  it('returns null for chrome-extension stack overflows', () => {
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

  it('returns null for frameless extension stack overflows (JAVASCRIPT-NEXTJS-1E)', () => {
    const event = {
      request: { url: 'https://www.irl.energy/interactive-map' },
      exception: {
        values: [
          {
            type: 'RangeError',
            value: 'Maximum call stack size exceeded.',
          },
        ],
      },
    };

    expect(isExtensionStackOverflowNoise(event)).toBe(true);
    expect(sentryBeforeSend(event)).toBeNull();
  });

  it('still forwards app-bundle RangeError stack overflows', () => {
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
                  filename: 'app:///_next/static/chunks/app/dashboard/page.js',
                  abs_path: 'app:///_next/static/chunks/app/dashboard/page.js',
                },
              ],
            },
          },
        ],
      },
    };

    expect(isExtensionStackOverflowNoise(event)).toBe(false);
    expect(sentryBeforeSend(event)).toEqual(event);
  });

  it('still forwards unrelated errors without injected-script stack frames', () => {
    const event = {
      request: { url: 'https://example.com/events' },
      exception: {
        values: [
          {
            value: 'TypeError: Cannot read properties of undefined',
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
});
