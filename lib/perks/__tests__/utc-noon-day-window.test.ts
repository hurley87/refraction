import { describe, it, expect } from 'vitest';
import { getUtcNoonDayWindow } from '../utc-noon-day-window';

describe('getUtcNoonDayWindow', () => {
  it('uses noon today as start when now is at or after 12:00 UTC', () => {
    const now = new Date(Date.UTC(2026, 7, 12, 15, 30, 0));
    const { start, end } = getUtcNoonDayWindow(now);

    expect(start.toISOString()).toBe('2026-08-12T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-13T12:00:00.000Z');
  });

  it('uses previous noon as start when now is before 12:00 UTC', () => {
    const now = new Date(Date.UTC(2026, 7, 12, 8, 0, 0));
    const { start, end } = getUtcNoonDayWindow(now);

    expect(start.toISOString()).toBe('2026-08-11T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-12T12:00:00.000Z');
  });

  it('treats exactly 12:00 UTC as the start of the new claim day', () => {
    const now = new Date(Date.UTC(2026, 7, 12, 12, 0, 0));
    const { start, end } = getUtcNoonDayWindow(now);

    expect(start.toISOString()).toBe('2026-08-12T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-13T12:00:00.000Z');
  });
});
