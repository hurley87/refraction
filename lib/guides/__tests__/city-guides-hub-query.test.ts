import { describe, expect, it } from 'vitest';
import {
  cityGuidesHubSearch,
  parseCityGuidesHubQuery,
} from '@/lib/guides/city-guides-hub-query';

const cities = ['Berlin', 'Global', 'Miami'];

describe('parseCityGuidesHubQuery', () => {
  it('defaults to city guides and every city', () => {
    expect(parseCityGuidesHubQuery({}, cities)).toEqual({
      type: 'guides',
      city: 'all',
    });
    expect(parseCityGuidesHubQuery({ type: 'guides' }, cities).type).toBe(
      'guides'
    );
  });

  it('opens Editorial from type=editorial', () => {
    expect(
      parseCityGuidesHubQuery({ type: 'editorial', city: 'Berlin' }, cities)
    ).toEqual({ type: 'editorials', city: 'Berlin' });
  });

  it('ignores an unknown type or city', () => {
    expect(
      parseCityGuidesHubQuery({ type: 'nope', city: 'Atlantis' }, cities)
    ).toEqual({ type: 'guides', city: 'all' });
  });
});

describe('cityGuidesHubSearch', () => {
  it('omits the defaults', () => {
    expect(cityGuidesHubSearch({ type: 'guides', city: 'all' })).toBe('');
  });

  it('writes the editorial toggle and the city', () => {
    expect(cityGuidesHubSearch({ type: 'editorials', city: 'Berlin' })).toBe(
      '?type=editorial&city=Berlin'
    );
  });
});
