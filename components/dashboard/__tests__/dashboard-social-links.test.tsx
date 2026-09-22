import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardSocialLinks from '../dashboard-social-links';
import type { UserProfile } from '@/lib/types';
import { markProfileCompleteRewardsTipSeen } from '@/lib/profile-completion';

vi.mock('@/components/dashboard/edit-socials-modal', () => ({
  default: () => null,
}));

const baseProfile: UserProfile = {
  wallet_address: '0xabc',
};

describe('DashboardSocialLinks profile tips', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('lists missing completion fields while the profile is incomplete', () => {
    render(<DashboardSocialLinks profile={baseProfile} />);

    expect(
      screen.getByText(/Complete your profile to earn 1,000 IRL Points/)
    ).toBeInTheDocument();
    expect(screen.getByText('Profile picture')).toBeInTheDocument();
    expect(
      screen.queryByText('Profile complete! You earned 1000 points.')
    ).not.toBeInTheDocument();
  });

  it('shows the rewards pointer after the profile is complete', async () => {
    render(
      <DashboardSocialLinks
        profile={{ ...baseProfile, profile_completion_awarded: true }}
      />
    );

    expect(
      await screen.findByText('Profile complete! You earned 1000 points.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Free drinks, secret guest list and hotel discounts are waiting for you/
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GO TO REWARDS' })).toHaveAttribute(
      'href',
      '/rewards'
    );
  });

  it('shows the rewards pointer when all completion fields are filled even before the award flag arrives', async () => {
    const favoritePlace = {
      place_id: 'place.1',
      name: 'Place',
      address: '1 Main',
      latitude: 1,
      longitude: 2,
    };

    render(
      <DashboardSocialLinks
        profile={{
          ...baseProfile,
          profile_picture_url: 'https://example.com/a.jpg',
          name: 'Alex',
          bio: 'Bio',
          instagram_handle: 'alex',
          favorite_music_venue: favoritePlace,
          favorite_gallery: favoritePlace,
          favorite_restaurant: favoritePlace,
          profile_completion_awarded: false,
        }}
      />
    );

    expect(
      await screen.findByText('Profile complete! You earned 1000 points.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'GO TO REWARDS' })
    ).toBeInTheDocument();
  });

  it('does not show the completed-profile pointer after it has been dismissed', async () => {
    markProfileCompleteRewardsTipSeen(baseProfile.wallet_address);

    render(
      <DashboardSocialLinks
        profile={{ ...baseProfile, profile_completion_awarded: true }}
      />
    );

    await screen.findByRole('button', { name: 'EDIT' });
    expect(
      screen.queryByText('Profile complete! You earned 1000 points.')
    ).not.toBeInTheDocument();
  });

  it('dismisses the completed-profile pointer', async () => {
    const user = userEvent.setup();
    render(
      <DashboardSocialLinks
        profile={{ ...baseProfile, profile_completion_awarded: true }}
      />
    );

    expect(
      await screen.findByText('Profile complete! You earned 1000 points.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss tip' }));
    expect(
      screen.queryByText('Profile complete! You earned 1000 points.')
    ).not.toBeInTheDocument();
  });
});
