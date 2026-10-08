import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import AddToListDrawer from '../add-to-list-drawer';
import { MapYellowTip } from '../map-yellow-tip';
import type { VisitStatus } from '@/lib/types';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function renderDrawer({
  onClose = vi.fn(),
  onReturnToCheckIn = vi.fn(),
  onListCreated,
  createListTip,
  visitStatus = null,
  onSelectVisitStatus = vi.fn(async () => {}),
}: {
  onClose?: () => void;
  onReturnToCheckIn?: () => void;
  onListCreated?: (listId: string, details: { isFirstList: boolean }) => void;
  createListTip?: ReactNode;
  visitStatus?: VisitStatus | null;
  onSelectVisitStatus?: (visitStatus: VisitStatus) => Promise<void>;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AddToListDrawer
        location={{
          placeId: 'place-1',
          name: 'Test Spot',
        }}
        walletAddress={WALLET}
        visitStatus={visitStatus}
        onSelectVisitStatus={onSelectVisitStatus}
        onClose={onClose}
        onReturnToCheckIn={onReturnToCheckIn}
        onListCreated={onListCreated}
        createListTip={createListTip}
      />
    </QueryClientProvider>
  );
}

describe('AddToListDrawer create flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns to the check-in sheet from the close button', async () => {
    const onReturnToCheckIn = vi.fn();
    const user = userEvent.setup();
    renderDrawer({ onReturnToCheckIn });

    await user.click(screen.getByRole('button', { name: 'Back to check-in' }));

    expect(onReturnToCheckIn).toHaveBeenCalledOnce();
  });

  it('fills the screen on mobile and caps height from sm up', () => {
    renderDrawer();

    const drawer = screen.getByTestId('add-to-list-drawer');
    expect(drawer.className).toContain('h-dvh');
    expect(drawer.className).toContain('sm:max-h-[70vh]');
  });

  it('titles the drawer with the location name and turns on the current status', () => {
    renderDrawer({ visitStatus: 'want_to_try' });

    expect(
      screen.getByRole('heading', { name: 'Test Spot' })
    ).toBeInTheDocument();
    expect(screen.queryByText('ADD TO LIST')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /want to try/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: /^been$/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('saves a new status and reverts the toggle when the save fails', async () => {
    const onSelectVisitStatus = vi
      .fn<(visitStatus: VisitStatus) => Promise<void>>()
      .mockRejectedValueOnce(new Error('nope'));
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'want_to_try', onSelectVisitStatus });

    const been = screen.getByRole('radio', { name: /^been$/i });
    await user.click(been);

    expect(onSelectVisitStatus).toHaveBeenCalledWith('been');
    await waitFor(() => expect(been).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('radio', { name: /want to try/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('only allows a comment once the spot is marked Been', async () => {
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'want_to_try' });

    const comment = screen.getByRole('textbox', { name: 'Comment' });
    expect(comment).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /^been$/i }));
    await waitFor(() => expect(comment).not.toBeDisabled());
  });

  it('disables the plus button when the spot is already on that list', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            lists: [
              {
                id: 'list-1',
                title: 'Existing',
                location_count: 1,
                contains_location: true,
              },
              {
                id: 'list-2',
                title: 'Other',
                location_count: 0,
                contains_location: false,
              },
            ],
          },
        }),
        { status: 200 }
      );
    });
    renderDrawer();

    const saved = await screen.findByRole('button', {
      name: 'Already saved to Existing',
    });
    expect(saved).toBeDisabled();
    expect(saved.className).toContain('text-[#A9A9A9]');
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^save$/i }).className).toContain(
      'bg-[#171717]'
    );
    expect(
      screen.getByRole('button', { name: 'Add location to Other' })
    ).toBeEnabled();
  });

  it('sends the comment with Been when saving to a list', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (
          url === '/api/player-lists/add-location' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { placeId: 'place-1', savedListCount: 1, pointsEarned: 0 },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              lists: [
                {
                  id: 'list-1',
                  title: 'Existing',
                  location_count: 0,
                  contains_location: false,
                },
              ],
            },
          }),
          { status: 200 }
        );
      });
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'been' });

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Great natural wine'
    );
    await user.click(
      await screen.findByRole('button', { name: 'Add location to Existing' })
    );
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const addCall = fetchMock.mock.calls.find(
        ([url]) => String(url) === '/api/player-lists/add-location'
      );
      expect(addCall).toBeTruthy();
      expect(
        JSON.parse(String((addCall![1] as RequestInit).body))
      ).toMatchObject({
        listIds: ['list-1'],
        visitStatus: 'been',
        comment: 'Great natural wine',
      });
    });
  });

  it('saves a comment without adding the spot to a list', async () => {
    const onReturnToCheckIn = vi.fn();
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === '/api/location-visit-status' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: { placeId: 'place-1', visitStatus: 'been' },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: { lists: [] } }),
          { status: 200 }
        );
      });
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'been', onReturnToCheckIn });

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Worth the wait'
    );
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const statusCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === '/api/location-visit-status' &&
          (init as RequestInit | undefined)?.method === 'POST'
      );
      expect(statusCall).toBeTruthy();
      expect(
        JSON.parse(String((statusCall![1] as RequestInit).body))
      ).toMatchObject({
        placeId: 'place-1',
        visitStatus: 'been',
        comment: 'Worth the wait',
      });
      expect(onReturnToCheckIn).toHaveBeenCalled();
    });
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === '/api/player-lists/add-location'
      )
    ).toBe(false);
  });

  it('prefills the existing comment and saves the edit in place', async () => {
    const onReturnToCheckIn = vi.fn();
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.startsWith('/api/location-comments')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                checkins: [],
                visitStatus: 'been',
                userComment: 'Great tacos',
              },
            }),
            { status: 200 }
          );
        }
        if (url === '/api/location-visit-status' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({ success: true, data: { visitStatus: 'been' } }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: { lists: [] } }),
          { status: 200 }
        );
      });
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'been', onReturnToCheckIn });

    const box = screen.getByRole('textbox', { name: 'Comment' });
    await waitFor(() => expect(box).toHaveValue('Great tacos'));

    await user.clear(box);
    await user.type(box, 'Great tacos and salsa');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onReturnToCheckIn).toHaveBeenCalled());
    const statusCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === '/api/location-visit-status'
    );
    expect(
      JSON.parse(String((statusCall![1] as RequestInit).body))
    ).toMatchObject({ comment: 'Great tacos and salsa' });
  });

  it('returns to check-in without saving when nothing changed', async () => {
    const onReturnToCheckIn = vi.fn();
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { lists: [] } }), {
        status: 200,
      })
    );
    const user = userEvent.setup();
    renderDrawer({ visitStatus: 'been', onReturnToCheckIn });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onReturnToCheckIn).toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        [
          '/api/location-visit-status',
          '/api/player-lists/add-location',
        ].includes(String(url))
      )
    ).toBe(false);
  });

  it('highlights the status already saved for this place', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/location-comments')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              checkins: [],
              hasUserCheckedIn: true,
              visitStatus: 'been',
            },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({ success: true, data: { lists: [] } }),
        { status: 200 }
      );
    });

    renderDrawer({ visitStatus: null });

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /^been$/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    );
    expect(screen.getByRole('radio', { name: /want to try/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('creates a list via the Create list submit button', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.startsWith('/api/player-lists') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: { list: { id: 'list-1', title: 'My list' } },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: { lists: [] } }),
          { status: 200 }
        );
      });

    const user = userEvent.setup();
    renderDrawer();

    await user.click(
      screen.getByRole('button', { name: /new collection|create new list/i })
    );

    const nameInput = await screen.findByPlaceholderText('My favorite spots');
    await user.type(nameInput, 'My list');

    const descriptionInput = screen.getByPlaceholderText(
      'What is this collection about?'
    );
    await user.type(descriptionInput, 'Late-night Berlin bars');

    await user.click(screen.getByRole('radio', { name: /^public$/i }));

    const saveButton = screen.getByRole('button', { name: 'Save new list' });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === '/api/player-lists' &&
          (init as RequestInit | undefined)?.method === 'POST'
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(String((postCall![1] as RequestInit).body));
      expect(body).toMatchObject({
        walletAddress: WALLET,
        title: 'My list',
        description: 'Late-night Berlin bars',
        isPrivate: false,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Test Spot' })
      ).toBeInTheDocument();
    });
  });

  it('adds the spot and hands off when onListCreated is provided', async () => {
    const onClose = vi.fn();
    const onListCreated = vi.fn();
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.startsWith('/api/player-lists') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: { list: { id: 'list-1', title: 'My list' } },
            }),
            { status: 200 }
          );
        }
        if (
          url.startsWith('/api/player-lists/add-location') &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { placeId: 'place-1', savedListCount: 1 },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: { lists: [] } }),
          { status: 200 }
        );
      });

    const user = userEvent.setup();
    renderDrawer({ onClose, onListCreated });

    await user.click(
      screen.getByRole('button', { name: /new collection|create new list/i })
    );

    const nameInput = await screen.findByPlaceholderText('My favorite spots');
    await user.type(nameInput, 'My list');

    const saveButton = screen.getByRole('button', { name: 'Save new list' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onListCreated).toHaveBeenCalledWith('list-1', {
        isFirstList: true,
      });
      expect(onClose).toHaveBeenCalled();
    });

    const addCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === '/api/player-lists/add-location' &&
        (init as RequestInit | undefined)?.method === 'POST'
    );
    expect(addCall).toBeTruthy();
    const addBody = JSON.parse(String((addCall![1] as RequestInit).body));
    expect(addBody).toMatchObject({
      walletAddress: WALLET,
      placeId: 'place-1',
      listIds: ['list-1'],
    });
  });

  it('reports isFirstList false when the player already has lists', async () => {
    const onListCreated = vi.fn();
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/player-lists') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: { list: { id: 'list-2', title: 'Second list' } },
          }),
          { status: 200 }
        );
      }
      if (
        url.startsWith('/api/player-lists/add-location') &&
        init?.method === 'POST'
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { placeId: 'place-1', savedListCount: 1 },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            lists: [
              {
                id: 'list-1',
                title: 'Existing',
                location_count: 1,
                contains_location: false,
              },
            ],
          },
        }),
        { status: 200 }
      );
    });

    const user = userEvent.setup();
    renderDrawer({ onListCreated });

    await screen.findByText('Existing');
    await user.click(
      screen.getByRole('button', { name: /new collection|create new list/i })
    );

    const nameInput = await screen.findByPlaceholderText('My favorite spots');
    await user.type(nameInput, 'Second list');
    await user.click(screen.getByRole('button', { name: 'Save new list' }));

    await waitFor(() => {
      expect(onListCreated).toHaveBeenCalledWith('list-2', {
        isFirstList: false,
      });
    });
  });

  it('counts selected lists beside Create new list', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            lists: [
              {
                id: 'list-1',
                title: 'One',
                location_count: 0,
                contains_location: false,
              },
              {
                id: 'list-2',
                title: 'Two',
                location_count: 0,
                contains_location: false,
              },
            ],
          },
        }),
        { status: 200 }
      );
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.queryByText(/add to \d+ list/i)).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', { name: 'Add location to One' })
    );
    expect(screen.getByText('Add to 1 list')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Add location to Two' })
    );
    expect(screen.getByText('Add to 2 lists')).toBeInTheDocument();
    expect(screen.queryByText('Add to 1 list')).not.toBeInTheDocument();
  });

  it('renders a coaching tip above CREATE NEW LIST', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { lists: [] } }), {
        status: 200,
      })
    );

    renderDrawer({
      createListTip: (
        <MapYellowTip pointer="bottom" pointerAlign="end" onDismiss={vi.fn()}>
          Group your favorite spots into something you can share with friends
        </MapYellowTip>
      ),
    });

    expect(
      screen.getByText(
        'Group your favorite spots into something you can share with friends'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('map-yellow-tip-pointer')).toHaveAttribute(
      'data-pointer-align',
      'end'
    );
  });
});
