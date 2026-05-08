import { describe, it, expect, beforeEach } from 'vitest';
import { SIGNUP_ATTRIBUTION_STORAGE_KEY } from '@/lib/analytics/attribution-core';
import {
  captureSignupAttributionFromNavigation,
  getSignupAttributionBodyFields,
} from '@/lib/analytics/attribution';

describe('signup attribution client persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores first-touch UTMs and preserves them on later navigation without UTMs', () => {
    captureSignupAttributionFromNavigation({
      pathname: '/',
      search: 'utm_source=instagram&utm_medium=social&utm_campaign=test',
    });

    captureSignupAttributionFromNavigation({
      pathname: '/interactive-map',
      search: '',
    });

    const body = getSignupAttributionBodyFields();
    expect(body.signup_attribution?.initial_utm_source).toBe('instagram');
    expect(body.signup_attribution?.initial_utm_medium).toBe('social');
    expect(body.signup_attribution?.utm_source).toBe('instagram');
  });

  it('updates last-touch UTMs when a later page has new UTMs', () => {
    captureSignupAttributionFromNavigation({
      pathname: '/',
      search: 'utm_source=instagram&utm_medium=social',
    });

    captureSignupAttributionFromNavigation({
      pathname: '/perks',
      search: 'utm_source=email&utm_medium=newsetter',
    });

    const body = getSignupAttributionBodyFields();
    expect(body.signup_attribution?.initial_utm_source).toBe('instagram');
    expect(body.signup_attribution?.utm_source).toBe('email');
    expect(body.signup_attribution?.utm_medium).toBe('newsetter');
  });

  it('captures checkpoint id from /c/[id]', () => {
    captureSignupAttributionFromNavigation({
      pathname: '/c/checkpoint-xyz',
      search: '',
    });

    const body = getSignupAttributionBodyFields();
    expect(body.signup_attribution?.checkpoint_id).toBe('checkpoint-xyz');
  });

  it('writes valid JSON to localStorage', () => {
    captureSignupAttributionFromNavigation({
      pathname: '/',
      search: 'utm_source=direct',
    });
    const raw = localStorage.getItem(SIGNUP_ATTRIBUTION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.firstTouch.utm_source).toBe('direct');
    expect(parsed.lastTouch.utm_source).toBe('direct');
  });
});
