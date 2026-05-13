import { describe, expect, it } from 'vitest';

import { sentryBeforeSend } from '@/lib/monitoring/sentry';

describe('sentryBeforeSend', () => {
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

  it('keeps errors when the stack has no inpage.js frames', () => {
    const event = {
      request: { url: 'https://irl.example.com/' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Something failed',
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
