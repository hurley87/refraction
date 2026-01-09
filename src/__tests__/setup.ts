// Vitest test setup file
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock NextResponse for testing
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => {
      const response = {
        status: init?.status || 200,
        json: async () => data,
        body: JSON.stringify(data),
      }
      return response
    }),
  },
}))

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
}))

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
}))

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
  Map: vi.fn(),
  Marker: vi.fn(),
  Popup: vi.fn(),
  GeolocateControl: vi.fn(),
  NavigationControl: vi.fn(),
  FullscreenControl: vi.fn(),
}))

// react-map-gl is mocked via alias in vitest.config.ts

// Suppress console errors in tests (optional - remove if you want to see all errors)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
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
