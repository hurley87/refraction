import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityGuideLocationsSection } from './city-guide-locations-section';
import type { CityGuideLocationSection } from '@/lib/db/guides';

const mockLogin = vi.fn();
const mockGetAccessToken = vi.fn();
const mockBearerGet = vi.fn();
const mockTrackEvent = vi.fn();
let loginOnComplete: ((params: { isNewUser: boolean }) => void) | undefined;
let authenticated = false;
let ready = true;
let setSentinelIntersecting: ((isIntersecting: boolean) => void) | null = null;

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    authenticated,
    ready,
    getAccessToken: mockGetAccessToken,
  }),
  useLogin: (callbacks?: {
    onComplete?: (params: { isNewUser: boolean }) => void;
  }) => {
    loginOnComplete = callbacks?.onComplete;
    return { login: mockLogin };
  },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
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
    setSentinelIntersecting = null;
    loginOnComplete = undefined;
    mockGetAccessToken.mockResolvedValue('token');

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
    expect(mockLogin).toHaveBeenCalledOnce();
    expect(mockTrackEvent).toHaveBeenCalledWith('gate_signup_clicked', {
      guide_slug: 'berlin',
    });
  });

  it('fires signup_from_gate only for new users after the gate CTA', async () => {
    const user = userEvent.setup();
    render(<CityGuideLocationsSection {...baseProps} />);

    act(() => setSentinelIntersecting?.(true));
    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));

    act(() => loginOnComplete?.({ isNewUser: false }));
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'signup_from_gate',
      expect.anything()
    );

    await user.click(screen.getByRole('button', { name: 'BECOME A MEMBER' }));
    act(() => loginOnComplete?.({ isNewUser: true }));
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_from_gate', {
      guide_slug: 'berlin',
    });
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
