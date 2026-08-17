import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PerkClaimShareModule from '../perk-claim-share-module';

const SHARE_URL =
  'https://www.irl.energy/rewards?perkId=perk-1&utm_source=member-share&utm_medium=share&utm_campaign=free-drink';

describe('PerkClaimShareModule', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Web Share API with the perk title and UTM link when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    const user = userEvent.setup();
    render(<PerkClaimShareModule perkTitle="Free Drink" perkId="perk-1" />);

    await user.click(screen.getByRole('button', { name: 'Share this perk' }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: 'Free Drink',
        url: SHARE_URL,
      });
    });
    expect(screen.queryByText('Link copied')).toBeNull();
  });

  it('copies the link and shows Link copied when Web Share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PerkClaimShareModule perkTitle="Free Drink" perkId="perk-1" />);

    await user.click(screen.getByRole('button', { name: 'Share this perk' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    });
    expect(await screen.findByText('Link copied')).toBeTruthy();
  });
});
