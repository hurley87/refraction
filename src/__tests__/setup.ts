// Vitest test setup file
import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

// MSW server lifecycle and console error suppression
const originalError = console.error;

beforeAll(() => {
  process.env.SPEND_RAIL_BASE_USDC_ENABLED = 'true';
  process.env.SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS =
    '0x4444444444444444444444444444444444444444';
  process.env.SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS =
    '0x2222222222222222222222222222222222222222';
  process.env.SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID = 'wallet_e1';
  process.env.SPEND_RAIL_STELLAR_USDC_ENABLED = 'false';
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET';

  // Start MSW server
  server.listen({ onUnhandledRequest: 'warn' });

  // Suppress common React warnings in tests
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: validateDOMNesting'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Close server and restore console after all tests
afterAll(() => {
  server.close();
  console.error = originalError;
});

// Mock NextResponse for testing - use importOriginal to keep NextRequest
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => {
        const response = {
          status: init?.status || 200,
          json: async () => data,
          body: JSON.stringify(data),
        };
        return response;
      }),
    },
  };
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Supabase client
vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(),
    })),
  },
}));

// Mock Privy
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(() => ({
    user: null,
    authenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    ready: true,
  })),
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

/** happy-dom is a browser-like environment; server-auth throws on import without this mock. */
vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: class MockPrivyServerClient {
    constructor(..._args: unknown[]) {
      void _args;
    }
  },
}));

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
  Map: vi.fn(),
  Marker: vi.fn(),
  Popup: vi.fn(),
  GeolocateControl: vi.fn(),
  NavigationControl: vi.fn(),
  FullscreenControl: vi.fn(),
}));

// react-map-gl is mocked via alias in vitest.config.ts
