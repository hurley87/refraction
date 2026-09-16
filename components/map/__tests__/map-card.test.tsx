import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapCard from '../map-card';
import { MapYellowTip } from '../map-yellow-tip';

describe('MapCard save-to-list tip', () => {
  it('renders a coaching tip above the save to list button', () => {
    render(
      <MapCard
        name="Test Spot"
        address="1 Main St"
        isExisting
        onAction={vi.fn()}
        onSaveToList={vi.fn()}
        saveToListTip={
          <MapYellowTip pointer="bottom" onDismiss={vi.fn()}>
            Start your first list
          </MapYellowTip>
        }
      />
    );

    expect(screen.getByText('Start your first list')).toBeInTheDocument();
    expect(screen.getByTestId('map-yellow-tip-pointer')).toHaveAttribute(
      'data-pointer',
      'bottom'
    );
    expect(
      screen.getByRole('button', { name: 'Save location to a list' })
    ).toBeInTheDocument();
  });
});
