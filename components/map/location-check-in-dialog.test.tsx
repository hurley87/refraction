import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationCheckInDialog } from './location-check-in-dialog';
import { MapYellowTip } from './map-yellow-tip';

const target = {
  latitude: 0,
  longitude: 0,
  place_id: 'place-1',
  name: 'Test Spot',
};

describe('LocationCheckInDialog save-to-list tour tip', () => {
  it('points the first-list tip at the save button', () => {
    render(
      <LocationCheckInDialog
        open
        onClose={vi.fn()}
        overlayClassName=""
        shellClassName=""
        panelClassName=""
        checkInSuccess={false}
        checkInTarget={target}
        isCheckingIn={false}
        checkInPointsEarned={0}
        checkInTotalPoints={0}
        savedVisitStatus={null}
        onSelectVisitStatus={vi.fn(async () => undefined)}
        onSaveToList={vi.fn()}
        saveToListTip={
          <MapYellowTip pointer="bottom" pointerAlign="end" onDismiss={vi.fn()}>
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
