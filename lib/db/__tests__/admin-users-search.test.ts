import { describe, it, expect } from 'vitest';
import { buildAdminUserSearchOr } from '../admin-users-search';

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
});
