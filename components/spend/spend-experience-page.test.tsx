import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { SpendExperiencePage } from '@/components/spend/spend-experience-page';
import type { SpendExperience, SpendSession } from '@/lib/types';
import type { SpendRailClientSummary } from '@/lib/spend-rail-config/types';

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  login: vi.fn(),
  sendTransaction: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    user: {
      id: 'privy-1',
      wallet: { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    },
    login: mocks.login,
    getAccessToken: mocks.getAccessToken,
  }),
  useSendTransaction: () => ({ sendTransaction: mocks.sendTransaction }),
  useWallets: () => ({ wallets: [] }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/analytics', () => ({
  initMixpanel: vi.fn(),
  trackEvent: vi.fn(),
}));

const spendExperience = {
  id: 'exp-1',
  title: 'IRL Spend',
  description: null,
  event_id: 'event-1',
  status: 'active',
  spend_rail: 'base_usdc',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  privy_server_wallet_id: 'wallet-1',
  server_wallet_address: '0x3333333333333333333333333333333333333333',
  server_wallet_chain: 'base',
  server_wallet_created_at: null,
  spend_create_idempotency_key: null,
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2026-01-02T00:00:00.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} satisfies SpendExperience;

const session = {
  id: 'sess-1',
  spend_experience_id: spendExperience.id,
  user_id: 'privy-1',
  wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  spend_rail: 'base_usdc',
  rail_user_wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  status: 'created',
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-01-02T00:00:00.000Z',
  completed_at: null,
} satisfies SpendSession;

const spendRailSummary = {
  rail: 'base_usdc',
  displayName: 'Base USDC',
  networkLabel: 'Base',
  assetSymbol: 'USDC',
  explorerTxUrlTemplate: null,
} satisfies SpendRailClientSummary;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderSpendExperiencePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SpendExperiencePage
        experienceId={spendExperience.id}
        initialExperience={spendExperience}
      />
    </QueryClientProvider>
  );
}

describe('SpendExperiencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccessToken.mockResolvedValue('token-1');
  });

  it('shows the conversion confirm API error message in the toast', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `/api/spend-experiences/${spendExperience.id}/sessions`) {
        return jsonResponse({
          success: true,
          data: {
            session,
            spendExperience,
            created: false,
            spendRailSummary,
          },
        });
      }
      if (url === `/api/spend-sessions/${session.id}/conversion/preview`) {
        return jsonResponse({
          success: true,
          data: {
            eligibility: {
              status: 'eligible',
              message: 'Ready to convert.',
              preview: {
                pointsRequired: 5000,
                usdcAmount: 5,
                receivingWalletAddress: session.wallet_address,
                treasuryWalletAddress: spendExperience.treasury_wallet_address,
                userPointsBalance: 7000,
                userUsdcBalance: 0,
                treasuryUsdcBalance: 100,
              },
            },
            spendExperience,
            session: {
              id: session.id,
              status: session.status,
              expires_at: session.expires_at,
            },
            spendRailSummary,
          },
        });
      }
      if (url === `/api/spend-sessions/${session.id}/conversion/confirm`) {
        return jsonResponse(
          { success: false, error: 'This session has expired.' },
          400
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSpendExperiencePage();

    await userEvent.click(
      await screen.findByRole('button', {
        name: /convert points to usdc on base/i,
      })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('This session has expired.');
    });
  });
});
