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

  it('shows only the saved status icon', () => {
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
        savedVisitStatus="want_to_try"
        onSelectVisitStatus={vi.fn(async () => undefined)}
        onSaveToList={vi.fn()}
      />
    );

    expect(screen.getByRole('radio', { name: /want to try/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(
      screen.queryByRole('radio', { name: /^been$/i })
    ).not.toBeInTheDocument();
  });

  it('lists member comments below the description', () => {
    render(
      <LocationCheckInDialog
        open
        onClose={vi.fn()}
        overlayClassName=""
        shellClassName=""
        panelClassName=""
        checkInSuccess={false}
        checkInTarget={{ ...target, description: 'A quiet bar.' }}
        isCheckingIn={false}
        checkInPointsEarned={0}
        checkInTotalPoints={0}
        savedVisitStatus={null}
        onSelectVisitStatus={vi.fn(async () => undefined)}
        onSaveToList={vi.fn()}
        locationCheckins={[
          {
            id: 1,
            comment: 'The natural wine list is excellent',
            pointsEarned: 100,
            username: 'ada',
          },
        ]}
      />
    );

    const description = screen.getByText('A quiet bar.');
    const comment = screen.getByText('The natural wine list is excellent');
    expect(description.compareDocumentPosition(comment)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByText('ada')).toBeInTheDocument();
  });
});
