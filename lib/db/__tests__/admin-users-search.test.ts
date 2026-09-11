import { describe, it, expect } from 'vitest';
import {
  buildAdminUserSearchOr,
  formatAdminUserSearchRow,
} from '../admin-users-search';

describe('buildAdminUserSearchOr', () => {
  it('returns null for blank input', () => {
    expect(buildAdminUserSearchOr('')).toBeNull();
    expect(buildAdminUserSearchOr('   ')).toBeNull();
  });

  it('matches email, username, wallet, name, and location columns', () => {
    expect(buildAdminUserSearchOr('Ada')).toBe(
      [
        'email.ilike."%Ada%"',
        'username.ilike."%Ada%"',
        'wallet_address.ilike."%Ada%"',
        'name.ilike."%Ada%"',
        'city.ilike."%Ada%"',
        'country.ilike."%Ada%"',
      ].join(',')
    );
  });

  it('strips PostgREST metacharacters so commas cannot split the or() list', () => {
    const filter = buildAdminUserSearchOr('foo,bar%_');
    expect(filter).toContain('foo bar');
    expect(filter?.startsWith('email.ilike."%')).toBe(true);
    expect(filter).not.toContain('foo,bar');
  });

  it('returns the profile fields used by the contributor picker', () => {
    expect(
      formatAdminUserSearchRow({
        id: 42,
        wallet_address: null,
        email: 'writer@example.com',
        username: 'writer',
        name: 'The Writer',
        bio: 'Writes about cities.',
        profile_picture_url: 'https://example.com/writer.jpg',
        instagram_handle: 'writer_irl',
        total_points: 12,
        created_at: '2026-01-01T00:00:00Z',
        country_id: null,
        geo_city_id: null,
        countries: null,
        geo_cities: null,
      })
    ).toEqual(
      expect.objectContaining({
        id: 42,
        name: 'The Writer',
        bio: 'Writes about cities.',
        profile_picture_url: 'https://example.com/writer.jpg',
        instagram_handle: 'writer_irl',
      })
    );
  });
});
