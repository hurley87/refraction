// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock NextResponse for testing (before any imports that use it)
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: { status?: number }) => {
      const response = {
        status: init?.status || 200,
        json: async () => data,
        body: JSON.stringify(data),
      };
      return response;
    }),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Supabase client
jest.mock('@/lib/db/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
        })),
        order: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(),
    })),
  },
}))

// Mock Privy
jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(() => ({
    user: null,
    authenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    ready: true,
  })),
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Mapbox GL
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(),
  Marker: jest.fn(),
  Popup: jest.fn(),
  GeolocateControl: jest.fn(),
  NavigationControl: jest.fn(),
  FullscreenControl: jest.fn(),
}))

// Mock react-map-gl (only if module exists)
try {
  require.resolve('react-map-gl');
  jest.mock('react-map-gl', () => {
    const React = require('react');
    return {
      Map: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
      Marker: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
      Popup: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
      Source: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
      Layer: () => null,
      GeolocateControl: () => null,
      NavigationControl: () => null,
      FullscreenControl: () => null,
    };
  });
} catch (e) {
  // Module doesn't exist in this context, skip mock
}

// Suppress console errors in tests (optional - remove if you want to see all errors)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: validateDOMNesting'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

