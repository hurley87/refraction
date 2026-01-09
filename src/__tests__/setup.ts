// Vitest test setup file
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './mocks/server'

// MSW server lifecycle and console error suppression
const originalError = console.error

beforeAll(() => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'warn' })

  // Suppress common React warnings in tests
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

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers()
})

// Close server and restore console after all tests
afterAll(() => {
  server.close()
  console.error = originalError
})

// Mock NextResponse for testing - use importOriginal to keep NextRequest
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
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
  }
})

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
