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
    expect(screen.getByTestId('map-yellow-tip-pointer')).toBeInTheDocument();
  });
});
