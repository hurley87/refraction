import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddToListDrawer from '../add-to-list-drawer';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function renderDrawer(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AddToListDrawer
        location={{
          placeId: 'place-1',
          name: 'Test Spot',
          category: { id: 'cat-1', name: 'Cafe', slug: 'cafe' },
          imageUrl: null,
        }}
        walletAddress={WALLET}
        onClose={onClose}
      />
    </QueryClientProvider>
  );
}

describe('AddToListDrawer create flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    await user.click(
      screen.getByRole('switch', {
        name: /toggle list visibility/i,
      })
    );

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
        isPrivate: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('ADD TO LIST')).toBeTruthy();
    });
  });
});
