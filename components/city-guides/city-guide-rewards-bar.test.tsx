import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CITY_GUIDE_REWARDS_HREF,
  CityGuideRewardsBar,
} from './city-guide-rewards-bar';

describe('CityGuideRewardsBar', () => {
  it('links to rewards with the city-guide source tag', () => {
    render(<CityGuideRewardsBar />);

    const link = screen.getByRole('link', { name: 'See rewards' });
    expect(link.getAttribute('href')).toBe(CITY_GUIDE_REWARDS_HREF);
    expect(CITY_GUIDE_REWARDS_HREF).toBe('/rewards?from=city-guide');
    expect(screen.getByRole('heading', { name: 'Rewards' })).toBeTruthy();
  });
});
