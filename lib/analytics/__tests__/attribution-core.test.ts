import { describe, it, expect } from 'vitest';
import {
  parseUtmFromSearch,
  extractCheckpointIdFromPath,
  extractOptionalQueryIds,
  normalizeSignupAttribution,
  accountCreatedAttributionFromPayload,
  truncateField,
  signupAttributionPayloadHasData,
  ATTRIBUTION_LIMITS,
} from '@/lib/analytics/attribution-core';

describe('attribution-core', () => {
  describe('parseUtmFromSearch', () => {
    it('parses standard UTM query keys', () => {
      const q =
        '?utm_source=instagram&utm_medium=social&utm_campaign=test&utm_term=a&utm_content=b';
      expect(parseUtmFromSearch(q)).toEqual({
        utm_source: 'instagram',
        utm_medium: 'social',
        utm_campaign: 'test',
        utm_term: 'a',
        utm_content: 'b',
      });
    });

    it('accepts search without leading ?', () => {
      expect(parseUtmFromSearch('utm_source=email')).toEqual({
        utm_source: 'email',
        utm_medium: undefined,
        utm_campaign: undefined,
        utm_term: undefined,
        utm_content: undefined,
      });
    });
  });

  describe('extractCheckpointIdFromPath', () => {
    it('reads checkpoint id from /c/[id]', () => {
      expect(extractCheckpointIdFromPath('/c/abc-123')).toBe('abc-123');
    });

    it('returns undefined for non-checkpoint paths', () => {
      expect(extractCheckpointIdFromPath('/interactive-map')).toBeUndefined();
    });
  });

  describe('extractOptionalQueryIds', () => {
    it('reads event_id and location_id aliases', () => {
      expect(
        extractOptionalQueryIds('?event_id=e1&location_id=99&other=1')
      ).toEqual({ event_id: 'e1', location_id: '99' });
      expect(extractOptionalQueryIds('?eventId=e2')).toEqual({
        event_id: 'e2',
        location_id: undefined,
      });
    });
  });

  describe('normalizeSignupAttribution', () => {
    it('classifies first-touch checkpoint landing', () => {
      expect(
        normalizeSignupAttribution({
          checkpoint_id: 'cp1',
        })
      ).toEqual({
        signup_source: 'event',
        signup_channel: 'checkpoint',
        signup_context: 'physical_touchpoint',
      });
    });

    it('detects checkpoint from initial landing URL path', () => {
      expect(
        normalizeSignupAttribution({
          landing_page: 'https://irl.energy/c/summer-party?utm_source=x',
        })
      ).toEqual({
        signup_source: 'event',
        signup_channel: 'checkpoint',
        signup_context: 'physical_touchpoint',
      });
    });

    it('prefers UTM over instagram referrer when no checkpoint', () => {
      expect(
        normalizeSignupAttribution({
          utm_source: 'Newsletter',
          utm_medium: 'email',
          referrer: 'https://www.instagram.com/foo',
        })
      ).toEqual({
        signup_source: 'newsletter',
        signup_channel: 'email',
      });
    });

    it('uses instagram/social when referrer is Instagram and no UTM', () => {
      expect(
        normalizeSignupAttribution({
          referrer: 'https://www.instagram.com/reel/xyz',
        })
      ).toEqual({
        signup_source: 'instagram',
        signup_channel: 'social',
      });
    });

    it('uses referral/web for non-Instagram referrer without UTM', () => {
      expect(
        normalizeSignupAttribution({
          referrer: 'https://news.example.com/article',
        })
      ).toEqual({
        signup_source: 'referral',
        signup_channel: 'web',
      });
    });

    it('defaults to direct', () => {
      expect(normalizeSignupAttribution({})).toEqual({
        signup_source: 'direct',
        signup_channel: 'direct',
      });
    });
  });

  describe('accountCreatedAttributionFromPayload', () => {
    it('returns merged Mixpanel fields', () => {
      const props = accountCreatedAttributionFromPayload({
        initial_utm_source: 'instagram',
        initial_utm_medium: 'social',
        initial_referrer: 'https://instagram.com/x',
        initial_landing_page: 'https://irl.energy/',
        utm_source: 'instagram',
        utm_medium: 'social',
        referrer: 'https://irl.energy/map',
        landing_page: 'https://irl.energy/map',
        current_path: '/interactive-map',
        checkpoint_id: undefined,
      });
      expect(props.signup_source).toBe('instagram');
      expect(props.signup_channel).toBe('social');
      expect(props.initial_utm_source).toBe('instagram');
      expect(props.current_path).toBe('/interactive-map');
    });
  });

  describe('signupAttributionPayloadHasData', () => {
    it('is false for an empty payload', () => {
      expect(signupAttributionPayloadHasData({})).toBe(false);
    });

    it('is true when any field is non-empty', () => {
      expect(signupAttributionPayloadHasData({ current_path: '/map' })).toBe(
        true
      );
    });
  });

  describe('truncateField', () => {
    it('respects max length', () => {
      const long = 'a'.repeat(ATTRIBUTION_LIMITS.utm + 50);
      expect(truncateField(long, ATTRIBUTION_LIMITS.utm)?.length).toBe(
        ATTRIBUTION_LIMITS.utm
      );
    });
  });
});
