import { describe, it, expect } from 'vitest';
import { resolveCityFromCoordinates } from '@/lib/utils/city-resolver';

describe('resolveCityFromCoordinates', () => {
  it('resolves New York City coordinates', () => {
    expect(resolveCityFromCoordinates(40.7128, -74.006)).toBe('New York City');
  });

  it('resolves Toronto coordinates', () => {
    expect(resolveCityFromCoordinates(43.6532, -79.3832)).toBe('Toronto');
  });

  it('resolves Amsterdam coordinates', () => {
    expect(resolveCityFromCoordinates(52.3676, 4.9041)).toBe('Amsterdam');
  });

  it('resolves Denver coordinates', () => {
    expect(resolveCityFromCoordinates(39.7392, -104.9903)).toBe('Denver');
  });

  it('resolves Mexico City coordinates', () => {
    expect(resolveCityFromCoordinates(19.4326, -99.1332)).toBe('Mexico City');
  });

  it('resolves London coordinates', () => {
    expect(resolveCityFromCoordinates(51.5074, -0.1278)).toBe('London');
  });

  it('resolves Singapore coordinates', () => {
    expect(resolveCityFromCoordinates(1.3521, 103.8198)).toBe('Singapore');
  });

  it('resolves Montreal coordinates', () => {
    expect(resolveCityFromCoordinates(45.5017, -73.5673)).toBe('Montreal');
  });

  it('resolves Hong Kong coordinates', () => {
    expect(resolveCityFromCoordinates(22.3193, 114.1694)).toBe('Hong Kong');
  });

  it('resolves Buenos Aires coordinates', () => {
    expect(resolveCityFromCoordinates(-34.6037, -58.3816)).toBe('Buenos Aires');
  });

  it('resolves Miami coordinates', () => {
    expect(resolveCityFromCoordinates(25.7617, -80.1918)).toBe('Miami');
  });

  it('resolves Cannes coordinates', () => {
    expect(resolveCityFromCoordinates(43.5528, 7.0174)).toBe('Cannes');
  });

  it('returns null for unknown location', () => {
    expect(resolveCityFromCoordinates(0, 0)).toBeNull();
  });

  it('returns null for coordinates in the middle of the ocean', () => {
    expect(resolveCityFromCoordinates(30, -40)).toBeNull();
  });

  it('resolves Brooklyn as New York City', () => {
    expect(resolveCityFromCoordinates(40.6782, -73.9442)).toBe('New York City');
  });
});
