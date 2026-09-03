import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoveLocationFromCustomList } from '@/hooks/usePlayerCustomLists';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function HookHarness({ onSuccess }: { onSuccess?: (data: unknown) => void }) {
  const { mutate, isPending } = useRemoveLocationFromCustomList(WALLET);
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        mutate(
          {
            listId: '11111111-1111-1111-1111-111111111111',
            placeId: 'place-1',
          },
          { onSuccess }
        )
      }
    >
      Remove
    </button>
  );
}

describe('useRemoveLocationFromCustomList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to remove-location and resolves', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            placeId: 'place-1',
            listId: '11111111-1111-1111-1111-111111111111',
            savedListCount: 0,
          },
        }),
        { status: 200 }
      )
    );
    const onSuccess = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness onSuccess={onSuccess} />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/player-lists/remove-location',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      walletAddress: WALLET,
      placeId: 'place-1',
      listId: '11111111-1111-1111-1111-111111111111',
    });
  });
});
