import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SponsoredActivationSwipeSlider } from '@/components/sponsored-activation/sponsored-activation-swipe-slider';

describe('SponsoredActivationSwipeSlider', () => {
  it('invokes onComplete once when completed via keyboard', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <SponsoredActivationSwipeSlider
        disabled={false}
        onComplete={onComplete}
      />
    );
    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{Enter}');
    expect(onComplete).toHaveBeenCalledTimes(1);
    await user.keyboard('{Enter}');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete when disabled', () => {
    const onComplete = vi.fn();
    render(<SponsoredActivationSwipeSlider disabled onComplete={onComplete} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
