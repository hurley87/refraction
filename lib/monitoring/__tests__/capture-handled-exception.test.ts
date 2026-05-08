import { describe, it, expect } from 'vitest';
import { normalizeError } from '../capture-handled-exception';

describe('normalizeError', () => {
  it('returns standard Error instances unchanged', () => {
    const original = new Error('something went wrong');
    expect(normalizeError(original)).toBe(original);
  });

  it('returns Error subclass instances unchanged', () => {
    class CustomError extends Error {}
    const original = new CustomError('custom');
    expect(normalizeError(original)).toBe(original);
  });

  it('wraps string errors', () => {
    const result = normalizeError('oops');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('oops');
  });

  it('extracts message from error-like objects (e.g. Privy SDK cross-realm errors)', () => {
    const privyLike = { message: 'Rate limit exceeded', status: 429 };
    const result = normalizeError(privyLike);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Rate limit exceeded');
  });

  it('extracts message from objects with an error string field', () => {
    const obj = { error: 'Unauthorized', code: 401 };
    const result = normalizeError(obj);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unauthorized');
  });

  it('prefers message over error field when both are present', () => {
    const obj = { message: 'Primary message', error: 'Secondary error' };
    const result = normalizeError(obj);
    expect(result.message).toBe('Primary message');
  });

  it('preserves the stack from error-like objects', () => {
    const errorLike = {
      message: 'Something failed',
      stack: 'Error: Something failed\n    at somewhere:1:1',
    };
    const result = normalizeError(errorLike);
    expect(result.stack).toBe(errorLike.stack);
  });

  it('JSON-serializes unrecognized objects into the message', () => {
    const weirdObj = { code: 'ERR_UNKNOWN', retryAfter: 30 };
    const result = normalizeError(weirdObj);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain('ERR_UNKNOWN');
  });

  it('falls back to "Unknown error" for empty objects', () => {
    const result = normalizeError({});
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error');
  });

  it('converts numbers to Error messages', () => {
    const result = normalizeError(42);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('42');
  });

  it('converts null to a meaningful Error', () => {
    const result = normalizeError(null);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('null');
  });

  it('converts undefined to a meaningful Error', () => {
    const result = normalizeError(undefined);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('undefined');
  });

  it('ignores blank message strings and falls back to serialization', () => {
    const obj = { message: '   ', code: 'BLANK' };
    const result = normalizeError(obj);
    expect(result).toBeInstanceOf(Error);
    // blank message should not be used; falls through to serialization
    expect(result.message).not.toBe('   ');
  });
});
