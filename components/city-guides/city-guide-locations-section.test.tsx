import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityGuideLocationsSection } from './city-guide-locations-section';
import type { CityGuideLocationSection } from '@/lib/db/guides';

const mockLogin = vi.fn();
const mockGetAccessToken = vi.fn();
const mockBearerGet = vi.fn();
const mockTrackEvent = vi.fn();
let loginOnComplete: (() => void) | undefined;
let loginOnError: ((error: string) => void) | undefined;
let authenticated = false;
let ready = true;
let walletAddress: string | undefined =
  '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
let setSentinelIntersecting: ((isIntersecting: boolean) => void) | null = null;

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    authenticated,
    ready,
    getAccessToken: mockGetAccessToken,
  }),
  useLogin: (callbacks?: {
    onComplete?: () => void;
    onError?: (error: string) => void;
  }) => {
    loginOnComplete = callbacks?.onComplete;
    loginOnError = callbacks?.onError;
    return { login: mockLogin };
  },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
}));

vi.mock('@/hooks/use-evm-wallet-address', () => ({
  useEvmWalletAddress: () => walletAddress,
}));

vi.mock('@/lib/api/privy-bearer-client', () => ({
  apiClientBearerGet: (...args: unknown[]) => mockBearerGet(...args),
}));

vi.mock('@/components/city-guides/city-guide-location-card', () => ({
  CityGuideLocationCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

function section(name: string): CityGuideLocationSection {
  return {
    heading: null,
    defaultContributorName: 'Alice',
    locations: [
      {
        membership_id: name === 'Public spot' ? 1 : 2,
        list_id: 'list',
        location_id: name === 'Public spot' ? 1 : 2,
        created_at: '2026-01-01T00:00:00.000Z',
        location: {
          id: name === 'Public spot' ? 1 : 2,
          place_id: name.toLowerCase().replace(' ', '-'),
          name,
          latitude: 1,
          longitude: 2,
        },
      },
    ],
  } as CityGuideLocationSection;
}

const baseProps = {
  slug: 'berlin',
  city: 'Berlin',
  returnPath: '/city-guides/berlin',
  initialLocationSections: [section('Public spot')],
  initialLocationContributorByPlaceId: {},
  initialContributorNames: ['Alice'],
  locationGate: {
    hiddenCount: 2,
    visibleCount: 1,
    totalCount: 3,
    teaserSummary: 'a listening bar and two galleries',
    primaryContributorName: 'Alice',
  },
};

describe('CityGuideLocationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = false;
    ready = true;
    walletAddress = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
    setSentinelIntersecting = null;
    loginOnComplete = undefined;
    loginOnError = undefined;
    mockGetAccessToken.mockResolvedValue('token');
    localStorage.clear();

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {
          setSentinelIntersecting = (isIntersecting: boolean) => {
            this.callback(
              [{ isIntersecting } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver
            );
          };
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the gate modal once the reader reaches the end of the free spots', async () => {
    const user = userEvent.setup();
    render(<CityGuideLocationsSection {...baseProps} />);

    expect(screen.getByText('Public spot')).toBeTruthy();
    expect(screen.queryByText('Alice • 3 RECCOS')).toBeNull();

    act(() => setSentinelIntersecting?.(true));

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Alice • 3 RECCOS')).toBeTruthy();
    expect(screen.getByText(/Unlock the other 2/)).toBeTruthy();
    expect(mockTrackEvent).toHaveBeenCalledWith('gate_viewed', {
      guide_slug: 'berlin',
    });

    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('gate_signup_clicked', {
      guide_slug: 'berlin',
    });
  });

  it('closes the gate before opening Privy, so its login modal is usable', async () => {
    const user = userEvent.setup();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));

    // The gate traps focus while mounted, so it must go before Privy opens.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(mockLogin).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });
  });

  it('re-opens the gate when the reader abandons the Privy flow', async () => {
    const user = userEvent.setup();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });

    act(() => loginOnError?.('exited_auth_flow'));

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('marks gate signup intent when Become a Member is clicked', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });

    const raw = localStorage.getItem('irl_signup_from_gate_v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ guide_slug: 'berlin' });
  });

  it('passes gate attribution on unlock and clears intent after success', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    mockBearerGet.mockResolvedValue({
      locationSections: [section('Public spot'), section('Hidden spot')],
      locationContributorByPlaceId: {},
      contributorNames: ['Alice'],
    });
    const { rerender } = render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });
    expect(localStorage.getItem('irl_signup_from_gate_v1')).toBeTruthy();

    authenticated = true;
    rerender(<CityGuideLocationsSection {...baseProps} />);

    await waitFor(() => {
      expect(mockBearerGet).toHaveBeenCalledWith(
        'token',
        '/api/city-guides/berlin/locations?from_gate=1&guide_slug=berlin'
      );
    });
    await waitFor(() => {
      expect(localStorage.getItem('irl_signup_from_gate_v1')).toBeNull();
    });
    // signup_from_gate is server-fired on net-new player create — not client Mixpanel.
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'signup_from_gate',
      expect.anything()
    );
  });

  it('re-opens the gate when the reader abandons the Privy flow without clearing intent', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledOnce();
    });
    expect(localStorage.getItem('irl_signup_from_gate_v1')).toBeTruthy();

    act(() => loginOnError?.('exited_auth_flow'));

    // Intent must survive Privy teardown errors so unlock can still attribute.
    expect(localStorage.getItem('irl_signup_from_gate_v1')).toBeTruthy();
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('re-opens the gate after dismissal once the sentinel is reached again', async () => {
    const user = userEvent.setup();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Still parked at the sentinel: dismissal must stick.
    act(() => setSentinelIntersecting?.(true));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Scroll away, then back down to the end of the free spots.
    act(() => setSentinelIntersecting?.(false));
    act(() => setSentinelIntersecting?.(true));

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('never shows the gate to a signed-in reader whose unlock is still loading', async () => {
    authenticated = true;
    mockBearerGet.mockReturnValue(new Promise(() => {}));

    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('never shows the gate while Privy is still resolving the session', async () => {
    ready = false;

    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('replaces the public slice and closes the modal after authenticated fetch', async () => {
    authenticated = true;
    mockBearerGet.mockResolvedValue({
      locationSections: [section('Public spot'), section('Hidden spot')],
      locationContributorByPlaceId: {},
      contributorNames: ['Alice'],
    });

    render(<CityGuideLocationsSection {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Hidden spot')).toBeTruthy();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Alice • 3 RECCOS')).toBeNull();
    expect(mockBearerGet).toHaveBeenCalledWith(
      'token',
      '/api/city-guides/berlin/locations'
    );
  });
});
