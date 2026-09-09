import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CuratedListShareButton } from '../curated-list-share-button';
import { shareCuratedListLink } from '@/lib/location-lists/share-curated-list';

const toastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
  },
}));

vi.mock('@/lib/location-lists/share-curated-list', () => ({
  shareCuratedListLink: vi.fn(),
}));

afterEach(() => {
  vi.mocked(shareCuratedListLink).mockReset();
  toastSuccess.mockReset();
});

describe('CuratedListShareButton', () => {
  it('shares the curated list slug URL', async () => {
    vi.mocked(shareCuratedListLink).mockResolvedValue('web_share');

    render(
      <CuratedListShareButton
        slug="michail-stangl-berlin"
        listTitle="Michail Stangl Berlin"
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /share michail stangl berlin/i })
    );

    await waitFor(() =>
      expect(shareCuratedListLink).toHaveBeenCalledWith({
        slug: 'michail-stangl-berlin',
        listTitle: 'Michail Stangl Berlin',
      })
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('toasts when the slug URL is copied', async () => {
    vi.mocked(shareCuratedListLink).mockResolvedValue('clipboard');

    render(
      <CuratedListShareButton
        slug="michail-stangl-berlin"
        listTitle="Michail Stangl Berlin"
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /share michail stangl berlin/i })
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('List link copied')
    );
  });
});
