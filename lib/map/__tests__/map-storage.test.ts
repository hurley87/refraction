import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  WELCOME_TOUR_STORAGE_KEY,
  LOCATION_INSTRUCTION_STORAGE_KEY,
  LIST_CREATE_MAP_TIP_STORAGE_KEY,
  getWelcomeTourStorageKey,
  readLocalStorageItem,
  writeLocalStorageItem,
} from '../map-storage';

describe('getWelcomeTourStorageKey', () => {
  it('scopes by wallet when provided', () => {
    expect(getWelcomeTourStorageKey('0xabc')).toBe(
      `${WELCOME_TOUR_STORAGE_KEY}:0xabc`
    );
  });

  it('returns the base key without a wallet', () => {
    expect(getWelcomeTourStorageKey()).toBe(WELCOME_TOUR_STORAGE_KEY);
    expect(getWelcomeTourStorageKey(null)).toBe(WELCOME_TOUR_STORAGE_KEY);
  });
});

describe('localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('writes and reads values', () => {
    writeLocalStorageItem(LOCATION_INSTRUCTION_STORAGE_KEY, '2');
    expect(readLocalStorageItem(LOCATION_INSTRUCTION_STORAGE_KEY)).toBe('2');
  });

  it('returns null for missing keys', () => {
    expect(readLocalStorageItem(LIST_CREATE_MAP_TIP_STORAGE_KEY)).toBeNull();
  });
});
