import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CHUNK_RELOAD_SESSION_KEY,
  isChunkLoadError,
  markChunkReloadAttempted,
  registerChunkLoadRecovery,
  shouldAttemptChunkReload,
} from '@/lib/monitoring/chunk-load-recovery';

describe('isChunkLoadError', () => {
  it('detects webpack ChunkLoadError by name', () => {
    const error = new Error('Loading chunk 4069 failed.');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('detects "Loading chunk N failed" messages', () => {
    expect(isChunkLoadError(new Error('Loading chunk 4069 failed.'))).toBe(
      true
    );
    expect(isChunkLoadError('Error: Loading chunk app-page failed.')).toBe(
      true
    );
  });

  it('detects dynamic import failure messages', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module')
      )
    ).toBe(true);
    expect(
      isChunkLoadError(new Error('Importing a module script failed.'))
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('TypeError: fetch failed'))).toBe(false);
    expect(isChunkLoadError(new Error('Unauthorized'))).toBe(false);
  });
});

describe('shouldAttemptChunkReload', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('allows reload when no prior attempt is recorded', () => {
    expect(shouldAttemptChunkReload(20_000)).toBe(true);
  });

  it('blocks reload within the cooldown window', () => {
    markChunkReloadAttempted(10_000);
    expect(shouldAttemptChunkReload(15_000)).toBe(false);
  });

  it('allows reload after the cooldown window', () => {
    markChunkReloadAttempted(10_000);
    expect(shouldAttemptChunkReload(25_000)).toBe(true);
  });
});

describe('registerChunkLoadRecovery', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reloads once on chunk load unhandled rejections', () => {
    registerChunkLoadRecovery();

    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', {
      value: new Error('Loading chunk 4069 failed.'),
    });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
    });

    window.dispatchEvent(event);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)).not.toBeNull();
  });

  it('does not reload twice within the cooldown window', () => {
    registerChunkLoadRecovery();

    const dispatchChunkFailure = () => {
      const event = new Event('unhandledrejection') as PromiseRejectionEvent;
      Object.defineProperty(event, 'reason', {
        value: new Error('Loading chunk 4069 failed.'),
      });
      Object.defineProperty(event, 'preventDefault', {
        value: vi.fn(),
      });
      window.dispatchEvent(event);
    };

    dispatchChunkFailure();
    dispatchChunkFailure();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
