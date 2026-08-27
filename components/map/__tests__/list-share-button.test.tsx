import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ListShareButton, ListSharePanel } from '../list-share-button';

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

const SHARE_URL = 'http://localhost:3000/map/alice/best-bars';
const CARD_PATH = '/map/alice/best-bars/opengraph-image';
const MESSAGE = `Check out Best Bars on IRL: ${SHARE_URL}`;

/** Web Share and clipboard live on the shared navigator; restored per test. */
function stubNavigator(props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

function openShareDialog() {
  render(
    <ListShareButton
      username="alice"
      listSlug="best-bars"
      listTitle="Best Bars"
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /share best bars/i }));
}

afterEach(() => {
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { clipboard?: unknown }).clipboard;
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe('ListShareButton', () => {
  it('previews the generated share card for the list', () => {
    openShareDialog();

    const card = screen.getByAltText('Share card for Best Bars');
    expect(card.getAttribute('src')).toContain(CARD_PATH);
    // Lazy loading would deadlock: the card stays transparent until it loads.
    expect(card).toHaveAttribute('loading', 'eager');
    expect(screen.getByText(SHARE_URL)).toBeInTheDocument();
  });

  it('copies the list link from the card dialog', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ clipboard: { writeText } });

    openShareDialog();
    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SHARE_URL));
    expect(toastSuccess).toHaveBeenCalledWith('List link copied');
  });

  it('reports an error when the link cannot be copied', async () => {
    stubNavigator({
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    openShareDialog();
    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Could not copy list link')
    );
  });

  it('shares the link so the card arrives as a tappable preview', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });

    openShareDialog();
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    // No `files` or `text`: a bare URL is what messaging apps unfurl.
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Best Bars',
        url: SHARE_URL,
      })
    );
  });

  it('hides the Web Share action when the browser lacks it', () => {
    openShareDialog();

    expect(
      screen.queryByRole('button', { name: /^share$/i })
    ).not.toBeInTheDocument();
  });

  it('delegates to the inline drawer presentation when requested', () => {
    const onRequestShare = vi.fn();
    render(
      <ListShareButton
        username="alice"
        listSlug="best-bars"
        listTitle="Best Bars"
        variant="full"
        onRequestShare={onRequestShare}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /share best bars/i }));

    expect(onRequestShare).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ListSharePanel', () => {
  it('shows the card, close control, and three requested actions', () => {
    render(
      <ListSharePanel
        username="alice"
        listSlug="best-bars"
        listTitle="Best Bars"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByAltText('Share card for Best Bars')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /close share card/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /share to/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^copy link$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /messages/i })).toHaveAttribute(
      'href',
      expect.stringContaining('sms:?&body=')
    );
  });

  it('sends the link to the native share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });
    render(
      <ListSharePanel
        username="alice"
        listSlug="best-bars"
        listTitle="Best Bars"
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /share to/i }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Best Bars',
        url: SHARE_URL,
      })
    );
  });

  it('carries the link in the Messages body', () => {
    render(
      <ListSharePanel
        username="alice"
        listSlug="best-bars"
        listTitle="Best Bars"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /messages/i })).toHaveAttribute(
      'href',
      `sms:?&body=${encodeURIComponent(MESSAGE)}`
    );
  });
});
