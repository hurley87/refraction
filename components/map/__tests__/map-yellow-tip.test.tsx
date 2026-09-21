import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapYellowTip } from '../map-yellow-tip';

describe('MapYellowTip', () => {
  it('renders the message and dismisses', () => {
    const onDismiss = vi.fn();
    render(
      <MapYellowTip onDismiss={onDismiss}>Search a spot you love</MapYellowTip>
    );

    expect(screen.getByText('Search a spot you love')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss tip' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('omits the dismiss control when the tip cannot be dismissed', () => {
    render(<MapYellowTip>Complete your profile</MapYellowTip>);

    expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Dismiss tip' })
    ).not.toBeInTheDocument();
  });

  it('renders an upward speech-bubble pointer', () => {
    const { rerender } = render(
      <MapYellowTip onDismiss={vi.fn()}>Search a spot you love</MapYellowTip>
    );
    expect(
      screen.queryByTestId('map-yellow-tip-pointer')
    ).not.toBeInTheDocument();

    rerender(
      <MapYellowTip pointer="top" onDismiss={vi.fn()}>
        Search a spot you love
      </MapYellowTip>
    );
    expect(screen.getByTestId('map-yellow-tip-pointer')).toHaveAttribute(
      'data-pointer',
      'top'
    );
  });

  it('renders a downward speech-bubble pointer', () => {
    render(
      <MapYellowTip pointer="bottom" onDismiss={vi.fn()}>
        Start your first list
      </MapYellowTip>
    );
    expect(screen.getByTestId('map-yellow-tip-pointer')).toHaveAttribute(
      'data-pointer',
      'bottom'
    );
  });

  it('aligns the pointer to the end of the bubble', () => {
    render(
      <MapYellowTip pointer="bottom" pointerAlign="end" onDismiss={vi.fn()}>
        Group your favorite spots
      </MapYellowTip>
    );
    expect(screen.getByTestId('map-yellow-tip-pointer')).toHaveAttribute(
      'data-pointer-align',
      'end'
    );
  });

  it('renders a dashboard link in the first-list message', () => {
    render(
      <MapYellowTip onDismiss={vi.fn()}>
        You&apos;re in! <a href="/dashboard">Go to your profile</a> to view your
        lists
      </MapYellowTip>
    );

    expect(
      screen.getByRole('link', { name: 'Go to your profile' })
    ).toHaveAttribute('href', '/dashboard');
  });
});
