import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}));

vi.mock('@/lib/admin-api-auth-headers', () => ({
  adminApiAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
}));

import { ActivationLaunchPanel } from './activation-launch-panel';

const VENUE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

function activationPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'act-1',
    slug: 'act-1',
    title: 'FREE 2 B with IRL',
    status: 'paused',
    settlement_rail: 'solana',
    campaign_wallet_address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    campaign_wallet_explorer_url: null,
    venue_settlement_wallet_address: VENUE,
    venue_settlement_wallet_explorer_url: null,
    usdc_asset_config: {
      mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      decimals: 6,
      symbol: 'CADD',
    },
    max_usdc_budget: null,
    max_redemptions: null,
    campaign_wallet_usdc_balance: 120.5,
    campaign_wallet_reserved_usdc: 35,
    campaign_wallet_sol_balance: 0.2,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(activation: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/campaign-wallet/send-to-venue')) {
      return jsonResponse(
        {
          success: true,
          data: {
            status: 'confirmed',
            amountUsdc: 85.5,
            destinationAddress: VENUE,
            explorerTxUrl: 'https://solscan.io/tx/sig',
          },
        },
        200
      );
    }
    if (url.endsWith('/reward-items')) {
      return jsonResponse({ success: true, data: { rewardItems: [] } });
    }
    if (url.endsWith('/act-1') && (!init || !init.method)) {
      return jsonResponse({ success: true, data: { activation } });
    }
    return jsonResponse({ success: false, error: 'unexpected' }, 500);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivationLaunchPanel
        activationId="act-1"
        getAccessToken={async () => 'token'}
        dashboardQueryKey={['admin-sponsored-activation-dashboard', 'act-1']}
      />
    </QueryClientProvider>
  );
}

describe('ActivationLaunchPanel send remaining balance to venue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the unreserved balance and sends it to the venue after confirmation', async () => {
    const fetchMock = mockFetch(activationPayload());
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmSpy);
    renderPanel();

    const button = await screen.findByRole('button', { name: 'Send to venue' });
    expect(screen.getByText('Send remaining balance to venue')).toBeTruthy();
    expect(screen.getByText('85.50 CADD')).toBeTruthy();
    expect(button.hasAttribute('disabled')).toBe(false);

    await userEvent.click(button);

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining(VENUE));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/sponsored-activations/act-1/campaign-wallet/send-to-venue',
        expect.objectContaining({ method: 'POST' })
      )
    );
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Remaining balance sent to the venue.',
        expect.objectContaining({
          action: expect.objectContaining({ label: 'View tx' }),
        })
      )
    );
  });

  it('does not send when the admin cancels the confirmation', async () => {
    const fetchMock = mockFetch(activationPayload());
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    );
    renderPanel();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Send to venue' })
    );

    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).endsWith('/send-to-venue')
      )
    ).toBe(false);
  });

  it('disables sending while the activation is live', async () => {
    mockFetch(activationPayload({ status: 'active' }));
    renderPanel();

    const button = await screen.findByRole('button', { name: 'Send to venue' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(
        'Pause or end the activation before sending the remaining balance.'
      )
    ).toBeTruthy();
  });
});
