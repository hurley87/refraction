/**
 * MSW server setup for Node.js tests
 *
 * This server intercepts API requests during tests and returns mock responses.
 * Import this in tests that need to mock API calls.
 *
 * Usage in tests:
 * ```typescript
 * import { server } from '@/__tests__/mocks/server'
 * import { http, HttpResponse } from 'msw'
 *
 * // Override a handler for a specific test
 * server.use(
 *   http.get('/api/player', () => {
 *     return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 })
 *   })
 * )
 * ```
 *
 * @see https://mswjs.io/docs/integrations/node
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Create the MSW server with default handlers
export const server = setupServer(...handlers)
