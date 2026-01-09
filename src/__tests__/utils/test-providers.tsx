/**
 * Test provider wrappers for component testing
 *
 * Provides QueryClient and other necessary providers for testing React components
 * that use React Query hooks.
 *
 * @example
 * ```typescript
 * import { createWrapper, renderWithProviders } from '@/__tests__/utils/test-providers'
 *
 * // Option 1: Use createWrapper with render
 * render(<MyComponent />, { wrapper: createWrapper() })
 *
 * // Option 2: Use renderWithProviders helper
 * renderWithProviders(<MyComponent />)
 * ```
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'

/**
 * Creates a fresh QueryClient instance for each test
 * Disables retries to make tests faster and more predictable
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Creates a wrapper component with all necessary providers
 * Use this with RTL's render function: render(<Component />, { wrapper: createWrapper() })
 */
export function createWrapper() {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

/**
 * Custom render function that includes all providers
 * Convenience wrapper around RTL's render
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: createWrapper(), ...options })
}

/**
 * Re-export testing library utilities for convenience
 */
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
