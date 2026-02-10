import { describe, it, expect } from 'vitest';

import { ADMIN_EMAILS, checkAdminPermission } from '../admin';

describe('Admin Module', () => {
  describe('ADMIN_EMAILS', () => {
    it('should contain expected admin emails', () => {
      expect(ADMIN_EMAILS).toContain('dhurls99@gmail.com');
      expect(ADMIN_EMAILS).toContain('kaitlyn@refractionfestival.com');
      expect(ADMIN_EMAILS).toContain('jim@refractionfestival.com');
      expect(ADMIN_EMAILS).toContain('malcolm@refractionfestival.com');
      expect(ADMIN_EMAILS).toContain('lovegreg@gmail.com');
      expect(ADMIN_EMAILS).toContain('greg@refractionfestival.com');
    });

    it('should have exactly 6 admin emails', () => {
      expect(ADMIN_EMAILS).toHaveLength(6);
    });
  });

  describe('checkAdminPermission', () => {
    it('should return true for a valid admin email', () => {
      expect(checkAdminPermission('dhurls99@gmail.com')).toBe(true);
    });

    it('should return true for each admin email in the list', () => {
      for (const email of ADMIN_EMAILS) {
        expect(checkAdminPermission(email)).toBe(true);
      }
    });

    it('should return false for a non-admin email', () => {
      expect(checkAdminPermission('random@example.com')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(checkAdminPermission(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(checkAdminPermission('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(checkAdminPermission('DHURLS99@GMAIL.COM')).toBe(false);
      expect(checkAdminPermission('Dhurls99@Gmail.com')).toBe(false);
    });
  });
});
