import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/src/__tests__/mocks/server';
import type { ComponentProps } from 'react';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

const mockUsePrivy = vi.fn();
const mockLogin = vi.fn();
const mockGetAccessToken = vi.fn(async () => 'test-token');

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
  useModalStatus: () => ({ isOpen: false }),
}));

vi.mock('@/hooks/use-evm-wallet-address', () => ({
  useEvmWalletAddress: () => WALLET,
}));

vi.mock('@/hooks/use-map-gate-analytics', () => ({
  useMapGateAnalytics: () => undefined,
}));

vi.mock('@/hooks/useFavorites', () => ({
  useFavoritePlaceIds: () => ({ data: new Set<string>() }),
  useToggleFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mockUsePlayerCustomLists = vi.fn(() => ({
  data: [] as Array<{ contains_location?: boolean }>,
}));

vi.mock('@/hooks/usePlayerCustomLists', () => ({
  usePlayerCustomLists: () => mockUsePlayerCustomLists(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock('@/components/shared/location-search', () => ({
  default: () => <div data-testid="location-search" />,
}));

vi.mock('@/components/location-lists-drawer', () => ({
  default: ({
    initialCuratedListId,
  }: {
    initialCuratedListId?: string | null;
  }) => (
    <div data-testid="location-lists-drawer">
      {initialCuratedListId ? (
        <span data-testid="curated-list-focus">{initialCuratedListId}</span>
      ) : null}
    </div>
  ),
}));

vi.mock('@/components/map/add-to-list-drawer', () => ({
  default: ({
    location,
    visitStatus,
    onReturnToCheckIn,
  }: {
    location: { name: string };
    visitStatus: string | null;
    onReturnToCheckIn: () => void;
  }) => (
    <div data-testid="add-to-list-drawer" data-visit-status={visitStatus ?? ''}>
      {location.name}
      <button type="button" onClick={onReturnToCheckIn}>
        Back to check-in
      </button>
    </div>
  ),
}));

vi.mock('@/components/map/player-location-prompt', () => ({
  PlayerLocationPrompt: ({ open }: { open: boolean }) =>
    open ? (
      <div data-testid="player-location-prompt">Where are you based?</div>
    ) : null,
}));

vi.mock('@/components/map/map-welcome-tour', () => ({
  MapWelcomeTour: ({ open }: { open: boolean }) =>
    open ? <div data-testid="map-welcome-tour">Welcome to IRL</div> : null,
}));

vi.mock('@/lib/utils/location-autofill', () => ({
  getSearchResultFlyToZoom: () => 14,
  isMapSearchGeneralAreaFeatureType: () => false,
  mergePoiAndAddressReverseGeocode: () => null,
  mergeSearchBoxReverseFeatures: () => null,
}));

import InteractiveMap from '../interactive-map';

const TEST_LOCATIONS = [
  {
    id: 1,
    name: 'Test Location',
    address: '123 Test St, New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    place_id: 'place-test-1',
    points_value: 100,
    description: 'A test venue',
    coin_image_url: null,
    coin_image_thumb_url: null,
    category: null,
    event_url: null,
    creator_wallet_address: null,
    creator_username: null,
  },
  {
    id: 2,
    name: 'Another Location',
    address: '456 Other Ave',
    latitude: 40.72,
    longitude: -74.01,
    place_id: 'place-test-2',
    points_value: 100,
    description: null,
    coin_image_url: null,
    coin_image_thumb_url: null,
    category: null,
    event_url: null,
    creator_wallet_address: null,
    creator_username: null,
  },
];

function renderMap(props: Partial<ComponentProps<typeof InteractiveMap>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <InteractiveMap {...props} />
    </QueryClientProvider>
  );
}

describe('InteractiveMap characterization', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(
          (_success: PositionCallback, error?: PositionErrorCallback) => {
            error?.({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        ),
      },
    });

    mockUsePlayerCustomLists.mockReturnValue({ data: [] });

    mockUsePrivy.mockReturnValue({
      user: {
        id: 'did:privy:test',
        wallet: { address: WALLET },
        email: { address: 'test@example.com' },
      },
      ready: true,
      authenticated: true,
      login: mockLogin,
      getAccessToken: mockGetAccessToken,
    });

    server.use(
      http.get('/api/locations', () =>
        HttpResponse.json({
          success: true,
          data: { locations: TEST_LOCATIONS },
        })
      ),
      http.get('/api/location-comments', () =>
        HttpResponse.json({
          success: true,
          data: { checkins: [], hasUserCheckedIn: false },
        })
      ),
      http.get('/api/player', () =>
        HttpResponse.json({
          success: true,
          data: {
            id: 1,
            wallet_address: WALLET,
            username: 'testuser',
            total_points: 100,
          },
        })
      ),
      http.get('/api/profile', () =>
        HttpResponse.json({
          success: true,
          data: {
            wallet_address: WALLET,
            username: 'testuser',
            name: 'Test User',
            country_id: 'us',
            geo_city_id: 'nyc',
            profile_picture_url: null,
            twitter_handle: null,
          },
        })
      ),
      http.get('/api/categories', () =>
        HttpResponse.json({
          success: true,
          data: {
            categories: [{ id: 'cat-1', name: 'Cafe', slug: 'cafe' }],
          },
        })
      ),
      http.get(/api\.mapbox\.com/, () =>
        HttpResponse.json({ features: [] }, { status: 404 })
      )
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders location markers from /api/locations', async () => {
    renderMap();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Marker at Test Location' })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Marker at Another Location' })
    ).toBeInTheDocument();
  });

  it('opens the check-in modal for deep-linked place ids', async () => {
    renderMap({
      initialPlaceId: 'place-test-1',
      deepLinkMapCardOnly: true,
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /want to try/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('radio', { name: /^been$/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(
      screen.getByRole('button', { name: /save location to a list/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Check In' })
    ).not.toBeInTheDocument();
  });

  it('opens the check-in modal for shared-link deep links', async () => {
    renderMap({
      initialPlaceId: 'place-test-1',
      deepLinkMapCardOnly: false,
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save location to a list/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /check-in/i })
    ).not.toBeInTheDocument();
  });

  it('opens the check-in modal when a marker is tapped', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^been$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save location to a list/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('add-to-list-drawer')).not.toBeInTheDocument();
  });

  it('closes the check-in modal and opens add to list on Want to try', async () => {
    server.use(
      http.post('/api/location-visit-status', () =>
        HttpResponse.json({ success: true })
      )
    );
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );
    await user.click(
      await screen.findByRole('radio', { name: /want to try/i })
    );

    expect(await screen.findByTestId('add-to-list-drawer')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('closes the check-in modal and opens add to list on Been', async () => {
    server.use(
      http.post('/api/location-visit-status', () =>
        HttpResponse.json({ success: true })
      )
    );
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );
    await user.click(await screen.findByRole('radio', { name: /^been$/i }));

    const drawer = await screen.findByTestId('add-to-list-drawer');
    expect(drawer).toHaveAttribute('data-visit-status', 'been');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('closes the check-in modal and opens add to list on Save to list', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );
    await user.click(
      await screen.findByRole('button', { name: /save location to a list/i })
    );

    expect(await screen.findByTestId('add-to-list-drawer')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('reopens the check-in modal for the same place from the add-to-list close button', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );
    await user.click(
      await screen.findByRole('button', { name: /save location to a list/i })
    );
    await user.click(
      await screen.findByRole('button', { name: 'Back to check-in' })
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Test Location' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('add-to-list-drawer')).not.toBeInTheDocument();
  });

  it('labels the save button Saved to a list when the spot is already saved', async () => {
    mockUsePlayerCustomLists.mockReturnValue({
      data: [{ contains_location: true }],
    });
    const user = userEvent.setup();
    renderMap();

    await user.click(
      await screen.findByRole('button', { name: 'Marker at Test Location' })
    );

    expect(
      await screen.findByRole('button', { name: /saved to a list/i })
    ).toBeInTheDocument();
  });

  it('opens the check-in modal from a map click instead of the map card', async () => {
    renderMap();

    await screen.findByRole('button', { name: 'Marker at Test Location' });
    fireEvent.click(screen.getByTestId('mock-map'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create and check in' })
    ).not.toBeInTheDocument();
  });

  it('shows the welcome tour once and suppresses the location prompt while open', async () => {
    server.use(
      http.get('/api/profile', () =>
        HttpResponse.json({
          success: true,
          data: {
            wallet_address: WALLET,
            username: 'testuser',
            name: 'Test User',
            country_id: null,
            geo_city_id: null,
            profile_picture_url: null,
            twitter_handle: null,
          },
        })
      )
    );

    renderMap();

    expect(await screen.findByTestId('map-welcome-tour')).toHaveTextContent(
      'Welcome to IRL'
    );
    expect(
      screen.queryByTestId('player-location-prompt')
    ).not.toBeInTheDocument();
  });

  it('passes initialCuratedListId into the lists drawer', async () => {
    renderMap({ initialCuratedListId: 'curated-list-abc' });

    const focuses = await screen.findAllByTestId('curated-list-focus');
    expect(focuses.length).toBeGreaterThan(0);
    expect(focuses[0]).toHaveTextContent('curated-list-abc');
  });
});
