import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Tier } from '@/lib/types';
import RewardsTiersView, { RewardsViewTabs } from '../rewards-tiers-view';

const sampleTiers: Tier[] = [
  {
    id: 'tier-general',
    title: 'General',
    min_points: 0,
    max_points: 5000,
    description: 'Starting out',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tier-resident',
    title: 'Resident',
    min_points: 15000,
    max_points: 25000,
    description: 'Part of the network',
    created_at: '',
    updated_at: '',
  },
];

vi.mock('@/hooks/useTiers', () => ({
  useTiers: () => ({ data: sampleTiers, isLoading: false }),
}));

vi.mock('@/hooks/usePlayer', () => ({
  useCurrentPlayer: () => ({ data: { total_points: 2000 } }),
}));

describe('RewardsViewTabs', () => {
  it('marks the active tab and reports the other selection', async () => {
    const onTabChange = vi.fn();
    const user = userEvent.setup();
    render(<RewardsViewTabs activeTab="rewards" onTabChange={onTabChange} />);

    expect(screen.getByRole('tab', { name: 'Rewards' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.click(screen.getByRole('tab', { name: 'Tiers' }));
    expect(onTabChange).toHaveBeenCalledWith('tiers');
  });
});

describe('RewardsTiersView', () => {
  it('lists tiers and a way in to how points are earned', () => {
    render(<RewardsTiersView />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Resident')).toBeInTheDocument();
    expect(screen.getByText('YOUR TIER')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Check in on the map' })
    ).toHaveAttribute('href', '/interactive-map');
    expect(
      screen.getByRole('link', { name: 'How points are earned' })
    ).toHaveAttribute('href', '/faq#earn-points');
  });
});
